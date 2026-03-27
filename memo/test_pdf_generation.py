import requests
import json

print("=" * 60)
print("TEST 1: PDF with ONLY live transcript (no AI summary)")
print("=" * 60)

payload1 = {
    "title": "Quick Standup Meeting",
    "transcript": "John: Good morning everyone\nSarah: Hi John, ready for standup\nJohn: Let's start. Sarah, your updates?\nSarah: Finished the login feature\nJohn: Great! Any blockers?\nSarah: No blockers",
    "duration": 180,
    "date": "2025-11-07"
}

print("Payload:", json.dumps(payload1, indent=2))
response1 = requests.post('http://127.0.0.1:8000/api/generate-pdf', json=payload1)
print(f"Response: {response1.status_code} - {len(response1.content)} bytes")

if response1.status_code == 200:
    with open('test_live_only.pdf', 'wb') as f:
        f.write(response1.content)
    print("✅ PDF saved as test_live_only.pdf\n")

print("=" * 60)
print("TEST 2: PDF with live transcript + AI decisions")
print("=" * 60)

payload2 = {
    "title": "Project Planning Meeting",
    "summary": "Team discussed Q4 roadmap and assigned tasks",
    "transcript": "Manager: Let's plan Q4\nDev1: I'll take the API work\nDev2: I'll handle frontend\nManager: Sounds good",
    "decisions": ["Dev1 owns API development", "Dev2 owns frontend development"],
    "action_items": ["Dev1: Start API design by Friday", "Dev2: Create frontend mockups"],
    "duration": 300,
    "date": "2025-11-07"
}

print("Payload:", json.dumps(payload2, indent=2))
response2 = requests.post('http://127.0.0.1:8000/api/generate-pdf', json=payload2)
print(f"Response: {response2.status_code} - {len(response2.content)} bytes")

if response2.status_code == 200:
    with open('test_with_decisions.pdf', 'wb') as f:
        f.write(response2.content)
    print("✅ PDF saved as test_with_decisions.pdf\n")

print("=" * 60)
print("TEST 3: PDF with EMPTY meeting (no content)")
print("=" * 60)

payload3 = {
    "title": "Empty Meeting Test",
    "duration": 10,
    "date": "2025-11-07"
}

print("Payload:", json.dumps(payload3, indent=2))
response3 = requests.post('http://127.0.0.1:8000/api/generate-pdf', json=payload3)
print(f"Response: {response3.status_code} - {len(response3.content)} bytes")

if response3.status_code == 200:
    with open('test_empty.pdf', 'wb') as f:
        f.write(response3.content)
    print("✅ PDF saved as test_empty.pdf\n")

print("=" * 60)
print("✅ ALL TESTS COMPLETE!")
print("=" * 60)

