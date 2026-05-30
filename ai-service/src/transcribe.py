import os
import time
import requests
import json
import re
import tempfile
import google.generativeai as genai
from src.config.env import settings

if settings.GOOGLE_API_KEY:
    genai.configure(api_key=settings.GOOGLE_API_KEY)

MODEL_NAME = "gemini-flash-latest"
GEMINI_PROCESSING_TIMEOUT = 300  # 5 minutes


def _download_media(media_url: str, suffix: str = ".mp3") -> str:
    """Download media to a temp file, return the file path."""
    response = requests.get(media_url, stream=True, timeout=60)
    if response.status_code != 200:
        raise Exception(f"Failed to download media: HTTP {response.status_code}")

    ext = ".mp3"
    url_lower = media_url.lower()
    for candidate in [".mp4", ".wav", ".m4a", ".webm", ".ogg", ".flac"]:
        if candidate in url_lower:
            ext = candidate
            break

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
    for chunk in response.iter_content(chunk_size=8192):
        if chunk:
            tmp.write(chunk)
    tmp.close()
    return tmp.name


def _parse_subtitles(raw_text: str) -> list:
    """Parse Gemini JSON response robustly."""
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned)
        cleaned = re.sub(r"\n?```$", "", cleaned)
    cleaned = cleaned.strip()

    try:
        result = json.loads(cleaned)
        if isinstance(result, list):
            return result
        raise ValueError("Response is not a JSON array")
    except (json.JSONDecodeError, ValueError):
        match = re.search(r"\[.*\]", cleaned, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise Exception(f"Cannot parse Gemini response as JSON array. Raw: {cleaned[:300]}")


def transcribe_with_gemini(media_url: str) -> list:
    """Transcribe using Gemini Flash. Returns subtitle cue list."""
    temp_path = None
    uploaded_file = None
    try:
        print(f"[Transcribe] Downloading: {media_url}")
        temp_path = _download_media(media_url)
        print(f"[Transcribe] Uploading to Gemini Files API...")
        uploaded_file = genai.upload_file(path=temp_path)

        deadline = time.time() + GEMINI_PROCESSING_TIMEOUT
        while uploaded_file.state.name == "PROCESSING":
            if time.time() > deadline:
                raise Exception("Timeout: Gemini File API processing exceeded 5 minutes")
            time.sleep(5)
            uploaded_file = genai.get_file(uploaded_file.name)

        if uploaded_file.state.name == "FAILED":
            raise Exception("Gemini File API processing FAILED")

        prompt = (
            "You are an expert transcriber. Transcribe this audio/video and return ONLY a JSON array.\n"
            "Each element must have exactly these fields:\n"
            "  index (integer, 1-based)\n"
            "  startTime (integer milliseconds)\n"
            "  endTime (integer milliseconds)\n"
            "  text (string, the spoken words in that interval)\n"
            "Rules: Output raw JSON only. No markdown. No extra text. Timings must be accurate."
        )

        model = genai.GenerativeModel(MODEL_NAME)
        result = model.generate_content([uploaded_file, prompt])
        subtitles = _parse_subtitles(result.text)
        print(f"[Transcribe] Gemini success: {len(subtitles)} cues")
        return subtitles

    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass
        if uploaded_file:
            try:
                genai.delete_file(uploaded_file.name)
            except Exception:
                pass


def transcribe_with_whisper(media_url: str) -> list:
    """Fallback transcription using OpenAI Whisper API."""
    import openai
    if not settings.OPENAI_API_KEY:
        raise Exception("OPENAI_API_KEY not set — Whisper fallback unavailable")

    client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
    temp_path = None
    try:
        print(f"[Transcribe] Whisper fallback — downloading: {media_url}")
        temp_path = _download_media(media_url)

        with open(temp_path, "rb") as f:
            response = client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
                response_format="verbose_json",
                timestamp_granularities=["segment"],
            )

        subtitles = []
        for i, seg in enumerate(response.segments or [], start=1):
            subtitles.append({
                "index": i,
                "startTime": int(seg.start * 1000),
                "endTime": int(seg.end * 1000),
                "text": seg.text.strip(),
            })

        print(f"[Transcribe] Whisper success: {len(subtitles)} cues")
        return subtitles

    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass


def transcribe_media(media_url: str) -> list:
    """Try Gemini Flash first, fall back to Whisper on failure."""
    try:
        return transcribe_with_gemini(media_url)
    except Exception as e:
        print(f"[Transcribe] Gemini failed: {e} — trying Whisper fallback...")
        return transcribe_with_whisper(media_url)


# Keep old name for backward compat with main.py
transcribe_media_gemini = transcribe_media
