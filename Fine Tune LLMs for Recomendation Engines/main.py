# main.py
from fastapi import FastAPI
from pydantic import BaseModel
import re
import requests
import os
from typing import List, Dict, Any

from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

# === CONFIG ===
OLLAMA_URL = "http://localhost:11434/api/generate"
XAI_API_URL = "https://api.x.ai/v1/chat/completions"
XAI_API_KEY = os.getenv("XAI_API_KEY")  # Set in env: export XAI_API_KEY=your_key

# === FASTAPI APP ===
app = FastAPI(title="Touristique - AI Travel Planner", version="1.0")

print("Loading RAG index …")
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
db = Chroma(persist_directory="chroma_db", embedding_function=embeddings)

# === MODELS ===
class TripRequest(BaseModel):
    preferences: List[str] = []
    duration: int = 2
    budget: float = 15000
    start_city: str = "Delhi"

# === HELPERS ===
def get_field(content: str, key: str, default: str = "?") -> str:
    for line in content.split("\n"):
        if line.startswith(f"{key}:"):
            return line.split(":", 1)[1].strip()
    return default

def query_ollama(prompt: str) -> str:
    payload = {
        "model": "phi3:mini",
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.2, "top_p": 0.9}
    }
    try:
        r = requests.post(OLLAMA_URL, json=payload, timeout=120)
        r.raise_for_status()
        return r.json()["response"]
    except Exception as e:
        print(f"Ollama failed: {e}")
        return ""

def query_grok(prompt: str) -> str:
    if not XAI_API_KEY:
        return ""
    headers = {
        "Authorization": f"Bearer {XAI_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "grok-beta",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2
    }
    try:
        r = requests.post(XAI_API_URL, json=payload, headers=headers, timeout=60)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"Grok API failed: {e}")
        return ""

def robust_parse_itinerary(text: str):
    # Ultra-flexible regex: handles ₹, Rs., commas, spaces, missing commas
    pattern = r"Day\s*(\d+):\s*([^-]+?)\s*-\s*(.+?)\.\s*Stay:\s*(.+?)\s*-\s*[₹₹]?[\s]*([\d,]+)\s*\.\s*Food:\s*(.+?)\s*-\s*[₹₹]?[\s]*([\d,]+)\s*\.\s*Cost:\s*[₹₹]?[\s]*([\d,]+)"
    matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)

    itinerary = []
    total = 0
    for m in matches:
        day, city, dest, stay, stay_c, food, food_c, day_c = m
        try:
            cost = int(day_c.replace(",", "").replace("₹", "").strip())
            total += cost
            itinerary.append({
                "day": int(day),
                "city": city.strip(),
                "destinations": [d.strip() for d in dest.split(",") if d.strip()],
                "stay": f"{stay.strip()} - ₹{stay_c.replace(',', '')}",
                "food": f"{food.strip()} - ₹{food_c.replace(',', '')}",
                "cost": cost
            })
        except:
            continue
    return itinerary, total

# === MAIN ENDPOINT ===
@app.post("/plan")
def plan_trip(req: TripRequest):
    # 1. Retrieve relevant places
    query = f"{', '.join(req.preferences)} near {req.start_city}"
    docs = db.similarity_search(query, k=8)

    context_lines = []
    for d in docs:
        place = get_field(d.page_content, "Place")
        city = get_field(d.page_content, "City")
        category = get_field(d.page_content, "Category")
        fee = get_field(d.page_content, "Entry Fee", "500")
        desc = get_field(d.page_content, "Description", "")
        short_desc = (desc[:70] + "...") if len(desc) > 70 else desc
        context_lines.append(f"- {place} ({city}): {category}, ₹{fee} — {short_desc}")

    context = "\n".join(context_lines) if context_lines else "No places found."

    # 2. Build bulletproof prompt
    max_per_day = req.budget // req.duration
    prompt = f"""
You are Touristique, India's smartest AI travel planner. Follow instructions EXACTLY.

USER REQUEST:
- Preferences: {', '.join(req.preferences)}
- Duration: {req.duration} days
- Budget: ₹{req.budget:,}
- Start: {req.start_city}

AVAILABLE PLACES (USE ONLY THESE):
{context}

RULES:
1. Use ONLY places from the list above.
2. 1–2 destinations per day.
3. Include eco-friendly stay & local food.
4. Cost per day ≤ ₹{max_per_day:,}
5. Output PLAIN TEXT ONLY. No markdown, JSON, or code.

OUTPUT FORMAT (COPY EXACTLY):
Day 1: Jaipur - Amber Fort. Stay: Eco Homestay - ₹2,800. Food: Dal Baati - ₹600. Cost: ₹5,400
Day 2: Jaipur - Hawa Mahal, City Palace. Stay: Eco Homestay - ₹2,800. Food: Pyaaz Kachori - ₹500. Cost: ₹6,300

Generate the {req.duration}-day itinerary now:
""".strip()

    print("Calling Phi-3 …")
    answer = query_ollama(prompt)

    # === FALLBACK TO GROK IF PHI-3 FAILS ===
    if not answer.strip() or "error" in answer.lower():
        print("Phi-3 failed. Trying Grok-4 (xAI)…")
        answer = query_grok(prompt)

    print("LLM RAW OUTPUT:\n" + answer + "\n" + "="*60)

    # 3. Parse
    itinerary, total = robust_parse_itinerary(answer)

    if not itinerary:
        return {
            "itinerary": [],
            "total_cost": 0,
            "summary": f"{req.duration}-day trip under ₹{req.budget:,}",
            "raw_output": answer,
            "retrieved_places": context,
            "error": "Failed to parse itinerary. See raw_output."
        }

    return {
        "itinerary": itinerary,
        "total_cost": total,
        "summary": f"{req.duration}-day trip for ₹{total:,} (under ₹{req.budget:,})"
    }

# === HEALTH CHECK ===
@app.get("/")
def home():
    return {"message": "Touristique API is running! POST to /plan"}