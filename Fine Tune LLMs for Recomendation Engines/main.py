from fastapi import FastAPI
from pydantic import BaseModel
import re
import requests
import json

from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

app = FastAPI()


print("Loading RAG index …")
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
db = Chroma(persist_directory="chroma_db", embedding_function=embeddings)

OLLAMA_URL = "http://localhost:11434/api/generate"

class TripRequest(BaseModel):
    preferences: list[str] = []         
    duration: int = 2
    budget: float = 15000
    start_city: str = "Delhi"

def query_ollama(prompt: str) -> str:
    payload = {
        "model": "phi3:mini",          
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.7}
    }
    r = requests.post(OLLAMA_URL, json=payload, timeout=120)
    r.raise_for_status()
    return r.json()["response"]

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

    print("Calling Phi‑3 …")
    answer = query_ollama(prompt)

    try:
        itinerary, total = parse_itinerary(answer)
        return {
            "itinerary": itinerary,
            "total_cost": total,
            "summary": f"{req.duration}-day trip under ₹{req.budget:,}"
        }
    except Exception as e:
        return {"raw_output": answer, "retrieved_places": context, "error": str(e)}