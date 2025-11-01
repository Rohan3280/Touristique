# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import re
import requests
import os
from typing import List, Dict, Any, Optional
from datetime import datetime

from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_ollama import OllamaLLM
from langchain.prompts import PromptTemplate

# Config
OLLAMA_URL = "http://localhost:11434/api/generate"
XAI_API_URL = "https://api.x.ai/v1/chat/completions"
XAI_API_KEY = os.getenv("XAI_API_KEY")

# FastAPI setup
app = FastAPI(title="Touristique API", version="2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading RAG index...")
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
db = Chroma(persist_directory="chroma_db", embedding_function=embeddings)

print("Loading Qwen chatbot model...")
qwen_llm = OllamaLLM(model="qwen2.5:7b-instruct-q4_K_M", temperature=0.3)

print("Trips storage disabled")

# Request models
class TripRequest(BaseModel):
    preferences: List[str] = []
    duration: int = 2
    budget: float = 15000
    start_city: str = "Delhi"

class AskRequest(BaseModel):
    question: str
    preferences: List[str] = []
    chosen_options: Optional[List[dict]] = None
    selected_option: Optional[dict] = None

# Helper functions
def get_field(content: str, key: str, default: str = "?") -> str:
    for line in content.split("\n"):
        if line.startswith(f"{key}:"):
            return line.split(":", 1)[1].strip()
    return default

def query_ollama(prompt: str, model: str = "phi3:mini", temperature: float = 0.2) -> str:
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": temperature, "top_p": 0.9}
    }
    try:
        r = requests.post(OLLAMA_URL, json=payload, timeout=120)
        r.raise_for_status()
        return r.json()["response"]
    except Exception as e:
        print(f"Ollama error: {e}")
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
        print(f"Grok API error: {e}")
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
    max_per_day = req.budget // req.duration
    
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

    answer = query_ollama(prompt, model="phi3:mini", temperature=temperature)
    
    if not answer.strip() or "error" in answer.lower():
        answer = query_grok(prompt, temperature)
    
    return answer

@app.post("/plan")
def plan_trip(req: TripRequest):
    print(f"Planning trip: {req.preferences} | {req.duration} days | Rs.{req.budget:,}")
    
    query = f"{', '.join(req.preferences)} near {req.start_city}"
    docs = db.similarity_search(query, k=20)

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

    all_options = []
    temperatures = [0.3, 0.5, 0.7, 0.6, 0.4]
    
    print(f"Generating 5 itinerary options...")
    
    for i in range(5):
        print(f"  Option {i+1}/5 (temp={temperatures[i]})...")
        
        answer = generate_single_itinerary(context, req, i, temperatures[i])
        itinerary, total = robust_parse_itinerary(answer)
        
        if itinerary and total > 0:
            all_options.append({
                "option_number": i + 1,
                "itinerary": itinerary,
                "total_cost": total,
                "summary": f"{req.duration}-day trip for ₹{total:,}",
                "raw_output": answer
            })
    
    if not all_options:
        return {
            "options": [],
            "error": "Failed to generate any valid itineraries.",
            "retrieved_places": context
        }
    
    all_options.sort(key=lambda x: x["total_cost"])
    
    print(f"Generated {len(all_options)} valid options")
    
    return {
        "options": all_options,
        "count": len(all_options),
        "budget_limit": req.budget,
        "retrieved_places_count": len(docs)
    }

@app.post("/ask")
def chat(req: AskRequest):
    print(f"Chat query: {req.question[:50]}...")
    
    filt = {}
    if req.preferences:
        cats = [p.lower() for p in req.preferences if p.lower() in {"heritage", "food", "nature", "adventure", "spiritual", "beach"}]
        if cats:
            filt = {"category": {"$in": cats}}
    
    retriever = db.as_retriever(search_kwargs={"k": 5, "filter": filt or None})
    docs = retriever.invoke(req.question)
    context = "\n---\n".join([d.page_content for d in docs])
    
    options_context = ""
    if req.chosen_options and len(req.chosen_options) > 0:
        options_context = "\n\nUSER'S GENERATED ITINERARY OPTIONS:\n"
        for opt in req.chosen_options[:5]:
            opt_num = opt.get("option_number", "?")
            total = opt.get("total_cost", 0)
            options_context += f"\nOption {opt_num} (Total: ₹{total:,}):\n"
            for day_info in opt.get("itinerary", []):
                day = day_info.get("day")
                city = day_info.get("city")
                dests = ", ".join(day_info.get("destinations", []))
                stay = day_info.get("stay", "-")
                food = day_info.get("food", "-")
                cost = day_info.get("cost", 0)
                options_context += f"  Day {day} ({city}): {dests} | Stay: {stay} | Food: {food} | Cost: ₹{cost:,}\n"
    
    selected_context = ""
    if req.selected_option:
        sel = req.selected_option
        selected_context = f"""

USER'S SELECTED ITINERARY (Option {sel.get('option_number', '?')}):
Total Cost: ₹{sel.get('total_cost', 0):,}
"""
        for day_info in sel.get("itinerary", []):
            day = day_info.get("day")
            city = day_info.get("city")
            dests = ", ".join(day_info.get("destinations", []))
            stay = day_info.get("stay", "-")
            food = day_info.get("food", "-")
            selected_context += f"\nDay {day} ({city}): {dests}\n  Stay: {stay} | Food: {food}\n"
    
    prompt_text = f"""
You are Bharat Yatri, a knowledgeable Indian travel guide.

{selected_context}
{options_context}

RELEVANT PLACE INFORMATION (use only these facts):
{context}

USER PREFERENCES: {", ".join(req.preferences) if req.preferences else "exploring India"}

USER QUESTION: {req.question}

INSTRUCTIONS:
1. If the user asks about their generated options, compare and explain the differences.
2. If the user selected an option, provide detailed insights about their chosen itinerary.
3. Answer in 3-4 sentences maximum. Be conversational and helpful.
4. If the question is in Hindi, reply in Hindi naturally.
5. Add one practical tip, eco-friendly suggestion, or local insight.
6. Never make up facts. Only use the information provided above.
7. If you don't have information, say so.

Answer:
""".strip()

    prompt = PromptTemplate.from_template(prompt_text)
    chain = prompt | qwen_llm
    
    try:
        answer = chain.invoke({}).strip()
        print(f"Chatbot response generated")
        return {
            "answer": answer,
            "context_used": {
                "has_options": bool(req.chosen_options),
                "has_selection": bool(req.selected_option),
                "preferences": req.preferences
            }
        }
    except Exception as e:
        print(f"Chatbot error: {e}")
        return {
            "answer": "Sorry, I ran into an issue. Please try again.",
            "error": str(e)
        }

# Trips endpoints removed (MongoDB disabled)
# trips endpoints removed

@app.get("/")
def home():
    return {
        "message": "Touristique API v2.0 - Running",
        "endpoints": {
            "/plan": "POST - Generate 5 itinerary options",
            "/ask": "POST - Context-aware chatbot",
        },
        "status": "running"
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "models": {
            "planner": "phi3:mini",
            "chatbot": "qwen2.5:7b-instruct-q4_K_M"
        },
        "rag_index": "loaded"
    }