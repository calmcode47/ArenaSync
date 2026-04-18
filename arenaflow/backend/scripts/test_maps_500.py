import requests
import uuid

def test_maps_details():
    venue_id = "77fc4bb0-0717-43e4-843b-0714703139ff"
    url = f"http://localhost:8000/api/v1/maps/venue/{venue_id}/details"
    try:
        resp = requests.get(url)
        print(f"Status: {resp.status_code}")
        print(f"Body: {resp.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_maps_details()
