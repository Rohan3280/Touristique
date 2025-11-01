# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
XAI_API_KEY = os.getenv("XAI_API_KEY")

# === FASTAPI APP ===
app = FastAPI(title="Touristique - AI Travel Planner", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

def query_ollama(prompt: str, temperature: float = 0.2) -> str:
    payload = {
        "model": "phi3:mini",
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": temperature, "top_p": 0.9}
    }
    try:
        r = requests.post(OLLAMA_URL, json=payload, timeout=120)
        r.raise_for_status()
        return r.json()["response"]
    except Exception as e:
        print(f"Ollama failed: {e}")
        return ""

def query_grok(prompt: str, temperature: float = 0.2) -> str:
    if not XAI_API_KEY:
        return ""
    headers = {
        "Authorization": f"Bearer {XAI_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "grok-beta",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": temperature
    }
    try:
        r = requests.post(XAI_API_URL, json=payload, headers=headers, timeout=60)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"Grok API failed: {e}")
        return ""

def robust_parse_itinerary(text: str):
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

def generate_single_itinerary(context: str, req: TripRequest, variation_num: int, temperature: float):
    """Generate one itinerary variation"""
    max_per_day = req.budget // req.duration
    
    # Add variation-specific instructions
    variation_hints = [
        "Focus on popular tourist spots and well-known attractions.",
        "Prioritize off-beat, less crowded hidden gems and local experiences.",
        "Balance between famous landmarks and local cultural experiences.",
        "Emphasize adventure activities and outdoor experiences.",
        "Focus on heritage sites, museums, and historical places."
    ]
    
    hint = variation_hints[variation_num % len(variation_hints)]
    
    prompt = f"""
You are Touristique, India's smartest AI travel planner. Follow instructions EXACTLY.

USER REQUEST:
- Preferences: {', '.join(req.preferences)}
- Duration: {req.duration} days
- Budget: ₹{req.budget:,}
- Start: {req.start_city}
- Style: {hint}

AVAILABLE PLACES (USE ONLY THESE):
{context}

RULES:
1. Use ONLY places from the list above.
2. 1–2 destinations per day.
3. Include eco-friendly stay & local food.
4. Cost per day ≤ ₹{max_per_day:,}
5. Create a UNIQUE itinerary different from typical tourist routes.
6. Output PLAIN TEXT ONLY. No markdown, JSON, or code.

OUTPUT FORMAT (COPY EXACTLY):
Day 1: Jaipur - Amber Fort. Stay: Eco Homestay - ₹2,800. Food: Dal Baati - ₹600. Cost: ₹5,400
Day 2: Jaipur - Hawa Mahal, City Palace. Stay: Eco Homestay - ₹2,800. Food: Pyaaz Kachori - ₹500. Cost: ₹6,300

Generate the {req.duration}-day itinerary now:
""".strip()

    # Try Phi-3 first
    answer = query_ollama(prompt, temperature)
    
    # Fallback to Grok
    if not answer.strip() or "error" in answer.lower():
        answer = query_grok(prompt, temperature)
    
    return answer

@app.post("/plan")
def plan_trip(req: TripRequest):
    # 1. Retrieve more places to have variety
    query = f"{', '.join(req.preferences)} near {req.start_city}"
    docs = db.similarity_search(query, k=20)  # Increased from 8 to 20

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

    # 2. Generate 5 different itinerary options
    all_options = []
    temperatures = [0.3, 0.5, 0.7, 0.6, 0.4]  # Different temperatures for variety
    
    print(f"Generating 5 itinerary options...")
    
    for i in range(5):
        print(f"Generating option {i+1}/5...")
        
        answer = generate_single_itinerary(context, req, i, temperatures[i])
        print(f"Option {i+1} RAW OUTPUT:\n{answer}\n{'='*60}")
        
        # Parse the itinerary
        itinerary, total = robust_parse_itinerary(answer)
        
        if itinerary and total > 0:  # Only add valid itineraries
            all_options.append({
                "option_number": i + 1,
                "itinerary": itinerary,
                "total_cost": total,
                "summary": f"{req.duration}-day trip for ₹{total:,}",
                "raw_output": answer
            })
    
    # 3. Return all options or error
    if not all_options:
        return {
            "options": [],
            "error": "Failed to generate any valid itineraries. Check raw outputs.",
            "retrieved_places": context
        }
    
    # Sort by total cost (gives users budget-friendly options first)
    all_options.sort(key=lambda x: x["total_cost"])
    
    return {
        "options": all_options,
        "count": len(all_options),
        "budget_limit": req.budget,
        "retrieved_places_count": len(docs)
    }

# === HEALTH CHECK ===
@app.get("/")
def home():
    return {"message": "Touristique API is running! POST to /plan"}