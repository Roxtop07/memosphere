from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_startup():
    response = client.get("/health")
    print(f"Status: {response.status_code}")
    print(f"JSON: {response.json()}")
    assert response.status_code == 200

if __name__ == "__main__":
    try:
        test_startup()
        print("✅ App startup verification successful")
    except Exception as e:
        print(f"❌ Startup failed: {e}")
