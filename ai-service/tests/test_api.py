"""
API Endpoint Integration Tests for MESO AI microservice (FastAPI).
Verifies:
- GET /health -> 200 OK
- POST /api/v1/investigations -> 200 OK with structured JSON
- POST /v1/investigations -> 200 OK with structured JSON
- POST /v1/investigations (invalid dates) -> 4xx Client Error with clean JSON (no stack trace leaked)
"""

import sys
import os
import pytest
from datetime import date
from starlette.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_health_endpoint(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "UP"

def test_investigation_endpoint_api_v1(client):
    payload = {
        "metric": "food_satisfaction",
        "start_date": "2026-05-22",
        "end_date": "2026-06-21",
        "comparison_start_date": "2026-04-21",
        "comparison_end_date": "2026-05-21"
    }
    res = client.post("/api/v1/investigations", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "investigation_id" in data
    assert "metric_summary" in data
    assert "observations" in data
    assert "evidence" in data
    assert "possible_factors" in data
    assert len(data["possible_factors"]) > 0
    assert any(f["factor_id"] == "HIGH_OIL_PREPARATION" for f in data["possible_factors"])

def test_investigation_endpoint_v1_alias(client):
    payload = {
        "metric": "food_satisfaction",
        "start_date": "2026-01-23",
        "end_date": "2026-02-22",
        "comparison_start_date": "2025-12-23",
        "comparison_end_date": "2026-01-22"
    }
    res = client.post("/v1/investigations", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "investigation_id" in data
    assert any(f["factor_id"] == "MENU_REPETITION_FATIGUE" for f in data["possible_factors"])

def test_invalid_request_handling(client):
    # Missing required start_date and end_date
    payload = {
        "metric": "food_satisfaction"
    }
    res = client.post("/v1/investigations", json=payload)
    assert res.status_code == 422 # Pydantic validation error
    data = res.json()
    assert "detail" in data
    # Verify no Python traceback in response body
    assert "Traceback (most recent call last)" not in res.text
