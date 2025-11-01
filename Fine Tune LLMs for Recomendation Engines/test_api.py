import requests
import json

print("Testing /plan endpoint...")
try:
    response = requests.post(
        "http://localhost:8000/plan",
        json={
            "preferences": ["heritage", "food"],
            "duration": 2,
            "budget": 15000,
            "start_city": "Delhi"
        },
        timeout=180
    )
    print("Status:", response.status_code)
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
except Exception as e:
    print(f"Error: {e}")

print("\n" + "="*60 + "\n")

print("Testing /ask endpoint...")
try:
    response = requests.post(
        "http://localhost:8000/ask",
        json={
            "question": "What are famous temples in Delhi?",
            "preferences": ["heritage"]
        }
    )
    print("Status:", response.status_code)
    result = response.json()
    print("Answer:", result.get("answer", "No answer"))
except Exception as e:
    print(f"Error: {e}")