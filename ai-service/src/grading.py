from pydantic import BaseModel, Field
from typing import Optional, List
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from src.config.env import settings
import requests
import os
from openai import OpenAI

# Initialize OpenAI Client for Audio (Whisper)
client = OpenAI(api_key=settings.OPENAI_API_KEY)

# Initialize LLM for Grading
llm = ChatOpenAI(
    model="gpt-4.1-nano", # Use GPT-4.1-nano for better grading accuracy and cheaper
    openai_api_key=settings.OPENAI_API_KEY,
    temperature=0.3
)

class GradingResult(BaseModel):
    score: float = Field(description="Score from 0 to 10")
    feedback: str = Field(description="Detailed feedback on strengths and weaknesses")
    corrected_version: Optional[str] = Field(description="Better version of the answer if applicable")

def transcribe_audio(audio_url: str) -> str:
    """
    Downloads audio from URL and transcribes it using OpenAI Whisper.
    """
    try:
        # 1. Download audio to a temporary file
        response = requests.get(audio_url)
        if response.status_code != 200:
            raise Exception("Failed to download audio file")
        
        filename = "temp_audio.mp3" # Support flexible formats in real prod
        with open(filename, "wb") as f:
            f.write(response.content)

        # 2. Transcribe
        with open(filename, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(
                model="whisper-1", 
                file=audio_file
            )
        
        # 3. Cleanup
        os.remove(filename)

        return transcription.text
    except Exception as e:
        print(f"Error transcribing audio: {e}")
        if os.path.exists("temp_audio.mp3"):
            os.remove("temp_audio.mp3")
        return ""

def grade_writing(question: str, answer: str) -> GradingResult:
    prompt = ChatPromptTemplate.from_template("""
    You are an IELTS/TOEIC Examiner. Grade the following WRITING answer.
    
    Question: {question}
    Student Answer: {answer}
    
    Provide:
    1. A score from 0 to 10 (Process as float).
    2. Detailed feedback explaining the score (Grammar, Vocabulary, Coherence).
    3. A corrected or improved version of the answer.
    
    Output JSON format: {{ "score": <number>, "feedback": "<text>", "corrected_version": "<text>" }}
    """)
    
    try:
        chain = prompt | llm
        # We can implement structured output parsing properly, but for now getting raw text and assuming JSON or using with_structured_output is better.
        # Let's use with_structured_output for robust JSON
        structured_llm = llm.with_structured_output(GradingResult)
        result = prompt | structured_llm
        return result.invoke({"question": question, "answer": answer})
    except Exception as e:
        print(f"Error grading writing: {e}")
        return GradingResult(score=0, feedback="Error during AI grading", corrected_version=None)

def grade_speaking(question: str, transcript: str) -> GradingResult:
    prompt = ChatPromptTemplate.from_template("""
    You are an IELTS/TOEIC Examiner. Grade the following SPEAKING answer (Transcript provided).
    
    Question: {question}
    Student Transcript: {transcript}
    
    Provide:
    1. A score from 0 to 10 (Process as float).
    2. Detailed feedback (Fluency, Grammar, Vocabulary, Coherence).
    3. A better way to express the ideas.
    
    Output JSON format: {{ "score": <number>, "feedback": "<text>", "corrected_version": "<text>" }}
    """)
    
    try:
        structured_llm = llm.with_structured_output(GradingResult)
        chain = prompt | structured_llm
        return chain.invoke({"question": question, "transcript": transcript})
    except Exception as e:
        print(f"Error grading speaking: {e}")
        return GradingResult(score=0, feedback="Error during AI grading", corrected_version=None)
