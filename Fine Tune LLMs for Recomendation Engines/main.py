import re
import json
import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_ollama import OllamaLLM
from langchain.prompts import PromptTemplate

app = FastAPI(title="Bharat Yatri API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],   
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading RAG index …")
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
db = Chroma(persist_directory="chroma_db", embedding_function=embeddings)

OLLAMA_URL = "http://localhost:11434/api/generate"

def query_ollama(prompt: str, model: str = "phi3:mini", temp: float = 0.7) -> str:
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": temp}
    }
    r = requests.post(OLLAMA_URL, json=payload, timeout=120)
    r.raise_for_status()
    return r.json()["response"]

class TripRequest(BaseModel):
    preferences: List[str] = []
    duration: int = 2
    budget: float = 15000
    start_city: str = "Delhi"

def parse_itinerary(text: str):
    pattern = (
        r"Day (\d+): (.+?) - (.+?)\. Stay: (.+?) - ₹([\d,]+)\. "
        r"Food: (.+?) - ₹([\d,]+)\. Cost: ₹([\d,]+)"
    )
    matches = re.findall(pattern, text)
    itinerary = []
    total = 0
    for m in matches:
        day, city, dest, stay, stay_c, food, food_c, day_c = m
        cost = int(day_c.replace(",", ""))
        total += cost
        itinerary.append({
            "day": int(day),
            "city": city.strip(),
            "destinations": [d.strip() for d in dest.split(",")],
            "stay": f"{stay.strip()} - ₹{stay_c}",
            "food": f"{food.strip()} - ₹{food_c}",
            "cost": cost
        })
    return itinerary, total

@app.post("/plan")
def plan_trip(req: TripRequest):
    query = f"{', '.join(req.preferences)} near {req.start_city} budget {req.budget}"
    docs = db.similarity_search(query, k=6)
    context = "\n".join([
        f"- {d.metadata.get('Place','?')} ({d.metadata.get('City','?')}): "
        f"{d.metadata.get('Category','?')}, ₹{d.metadata.get('Entry Fee','500')}"
        for d in docs
    ])

    prompt = f"""
You are Touristique, India's smartest AI travel planner.

User wants: {', '.join(req.preferences)}
Duration: {req.duration} days
Budget: ₹{req.budget:,}
Start: {req.start_city}

REAL PLACES:
{context}

Generate a {req.duration}-day itinerary:
- Use only places from the list above
- 1‑2 destinations per day
- Eco‑friendly stay
- Local food
- Stay under budget

Format exactly:
Day 1: Jaipur - Amber Fort. Stay: Eco Homestay - ₹2,800. Food: Dal Baati - ₹600. Cost: ₹5,400
""".strip()

    answer = query_ollama(prompt, model="phi3:mini", temp=0.7)

    try:
        itinerary, total = parse_itinerary(answer)
        return {
            "itinerary": itinerary,
            "total_cost": total,
            "summary": f"{req.duration}-day trip under ₹{req.budget:,}"
        }
    except Exception as e:
        return {"raw_output": answer, "retrieved_places": context, "error": str(e)}

class AskRequest(BaseModel):
    question: str
    preferences: List[str] = []
    chosen_card: Optional[dict] = None   # from /plan

qwen_llm = OllamaLLM(model="qwen2.5:7b-instruct-q4_K_M", temperature=0.3)

@app.post("/ask")
def chat(req: AskRequest):
    # 1. Build filter
    filt = {}
    if req.preferences:
        cats = [p.lower() for p in req.preferences if p in {"heritage","food","nature","adventure"}]
        if cats:
            filt["category"] = {"$in": cats}
    if req.chosen_card and req.chosen_card.get("city"):
        filt["city"] = req.chosen_card["city"].lower()

    retriever = db.as_retriever(search_kwargs={"k": 5, "filter": filt or None})
    docs = retriever.invoke(req.question)
    context = "\n---\n".join([d.page_content for d in docs])

    card_ctx = ""
    if req.chosen_card:
        c = req.chosen_card
        card_ctx = f"""
USER'S SELECTED CARD (Day {c.get('day','?')} – {c.get('city','?')}):
• Destinations: {", ".join(c.get('destinations',[]))}
• Food: {c.get('food','-')}
• Stay: {c.get('stay','-')}
• Cost: ₹{c.get('cost','?')}
Answer **with reference to this card**.
""".strip()


    prompt_text = f"""
You are **Bharat Yatri**, a warm Indian travel companion.

{card_ctx}

Relevant facts (use ONLY these):
{context}

User likes: {", ".join(req.preferences) if req.preferences else "exploring India"}

Question: {req.question}

• Answer in 2–3 sentences.
• If question is in Hindi, reply in Hindi.
• Add one practical or eco tip.
• NEVER hallucinate.
""".strip()

    prompt = PromptTemplate.from_template(prompt_text)
    chain = prompt | qwen_llm
    answer = chain.invoke({}).strip()
    return {"answer": answer}