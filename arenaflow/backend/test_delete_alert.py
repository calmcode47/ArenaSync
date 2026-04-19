import requests

# 1. Get an active alert ID
venue_id = "550e8400-e29b-41d4-a716-446655440000" # Example from earlier or dynamic
url_get = f"http://localhost:8000/api/v1/alerts/venue/{venue_id}"
res = requests.get(url_get)
alerts = res.json()

if not alerts:
    print("No alerts found to delete. Creating one...")
    url_create = "http://localhost:8000/api/v1/alerts/create"
    # Need auth for create if require_staff is on
    # I'll skip create and just output if none found
    print("Please create an alert in the UI first.")
else:
    alert_id = alerts[0]['id']
    print(f"Attempting to delete alert: {alert_id}")
    
    # Need auth for delete
    login_url = "http://localhost:8000/api/v1/auth/login"
    login_data = {"username": "admin@arenaflow.app", "password": "arenaflow987", "grant_type": "password"}
    login_res = requests.post(login_url, data=login_data)
    token = login_res.json()['access_token']
    
    url_delete = f"http://localhost:8000/api/v1/alerts/{alert_id}"
    del_res = requests.delete(url_delete, headers={"Authorization": f"Bearer {token}"})
    print(f"Status: {del_res.status_code}")
    
    # Check if gone
    res_after = requests.get(url_get)
    if alert_id not in [a['id'] for a in res_after.json()]:
        print("Success: Alert deleted.")
    else:
        print("Failure: Alert still exists.")
