import sys
import os

# Reconfigure stdout and stderr to use UTF-8, specifically to handle Emojis on Windows
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        # Fallback for older python versions if reconfigure is not available
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Add src to python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.transcribe import transcribe_media_gemini

def main():
    test_audio_url = "http://www.voiptroubleshooter.com/open_speech/american/OSR_us_000_0010_8k.wav"
    print(f"🚀 Starting transcription test with URL: {test_audio_url}")
    
    try:
        subtitles = transcribe_media_gemini(test_audio_url)
        print("\n🎉 Transcription Success!")
        print("Subtitles output:")
        for sub in subtitles[:5]: # Print first 5 subtitles
            print(f"[{sub.get('startTime')}ms -> {sub.get('endTime')}ms] {sub.get('index')}. {sub.get('text')}")
        if len(subtitles) > 5:
            print(f"... and {len(subtitles) - 5} more cues.")
    except Exception as e:
        print(f"\n❌ Transcription failed: {e}")

if __name__ == "__main__":
    main()
