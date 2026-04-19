import requests

url = "http://localhost:8000/api/v1/auth/login"
data = {
    "username": "admin@arenaflow.app",
    "password": "arenaflow987",
    "grant_type": "password"
}

print("Testing login with form-data...")
try:
    response = requests.post(url, data=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
