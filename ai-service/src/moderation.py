from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field
import os

class ModerationResult(BaseModel):
    is_safe: bool = Field(description="True if the content is safe, False otherwise")
    reason: str = Field(description="The reason why the content is not safe, or empty if safe")
    confidence_score: int = Field(description="Confidence score from 0 to 100")
    detected_word: str = Field(description="The specific word or phrase that triggered the violation, if any")

def moderate_content(text: str) -> ModerationResult:
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0,
        api_key=os.getenv("OPENAI_API_KEY")
    )
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a strict Content Moderation AI for a language learning platform (Lingora).
        Your task is to analyze the user's input text (which can be in Vietnamese or English) and detect if it violates community standards.
        
        Violations include:
        - Hate speech, slurs, discrimination
        - Harassment, bullying
        - Sexual content, explicit language
        - Spam, scams
        - Violence, threats
        
        If the content is SAFE, return is_safe=True.
        If the content is UNSAFE, return is_safe=False, provide a reason, a confidence score (80-100), and the specific detected word/phrase.
        
        Respond in JSON format matching the schema.
        """),
        ("human", "{text}")
    ])
    
    chain = prompt | llm.with_structured_output(ModerationResult)
    
    try:
        result = chain.invoke({"text": text})
        return result
    except Exception as e:
        print(f"Error moderating content: {e}")
        # Default to safe if AI fails to avoid blocking users unnecessarily
        return ModerationResult(is_safe=True, reason="", confidence_score=0, detected_word="")
