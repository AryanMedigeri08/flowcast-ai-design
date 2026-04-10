import requests
import json

def test_root():
    try:
        r = requests.get("http://localhost:8000/")
        print("Root Check:", r.json())
    except Exception as e:
        print("Root Check Failed:", e)

def test_forecast():
    try:
        data = {"sku_id": "sku_1", "base_demand": 100, "trend": 0.5, "days": 7}
        r = requests.post("http://localhost:8000/predict/forecast", json=data)
        print("Forecast Check:", r.json())
    except Exception as e:
        print("Forecast Check Failed:", e)

if __name__ == "__main__":
    # Note: Backend must be running for this to work.
    # We will try to start the backend in a background process if possible, 
    # but for verification here we just check if it's reachable.
    test_root()
    test_forecast()
