import requests

url = "http://localhost:4000/gateway/weather-cool"

params = {
    "latitude": 21.76,
    "longitude": 72.13,
    "current_weather": "true"
}

headers = {
    "X-API-Key": "key_e4d98eb4-36f9-4818-9b15-e2a5b6dfc54a",
    "Accept": "application/json"
}

response = requests.get(url, params=params, headers=headers, timeout=10)

print("Status Code:", response.status_code)
print("Response:", response.json())
