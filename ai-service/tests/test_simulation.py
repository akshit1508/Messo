"""
Comprehensive Test Suite for MESO AI Simulation Engine (AI Batch 4).
Verifies:
1. Scenario validation
2. Baseline preservation
3. Scenario feature transformation (pure function)
4. Food replacement scenario
5. Repetition change scenario
6. Poll / repetition signal separation
7. Monte Carlo distribution generation
8. Percentile calculations (P10 <= P50 <= P90)
9. Uncertainty propagation & low-data guardrails
10. Hard safety rule: Zero database mutation on operational tables
11. API integration (FastAPI POST /api/v1/simulations and /v1/simulations)
"""

import sys
import os
import pytest
from datetime import date
from starlette.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.engines.simulation import SimulationEngine, apply_scenario
from app.data.schemas import SimulationRequest, ScenarioMeal
from app.data.client import MesoDbClient
from app.main import app

@pytest.fixture
def engine():
    return SimulationEngine()

@pytest.fixture
def client():
    return TestClient(app)

# -----------------------------------------------------------------------------
# TEST 1: Scenario Validation
# -----------------------------------------------------------------------------
def test_scenario_validation(engine):
    # Default parameters filled cleanly
    req = SimulationRequest()
    s_type, b_food, s_food, t_date, m_type = engine.validate_request(req)
    assert s_type == "FOOD_REPLACEMENT"
    assert b_food is not None
    assert s_food is not None
    assert t_date is not None
    assert m_type in ["Breakfast", "Lunch", "Dinner"]

# -----------------------------------------------------------------------------
# TEST 2: Baseline Preservation
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_baseline_preservation(engine):
    req = SimulationRequest(
        baseline_food="Paneer Butter Masala",
        scenario_food="Dal Tadka",
        simulation_date=date(2026, 6, 15),
        meal_type="Dinner"
    )
    res = await engine.simulate(req)
    # Baseline prediction must match standard ForecastEngine output
    base_feats, _, _ = engine.forecast_engine.build_features_for_food("Paneer Butter Masala", date(2026, 6, 15), "Dinner")
    expected_pred, _ = engine.forecast_engine.predict_ml(base_feats)
    assert abs(res.baseline.prediction - expected_pred) < 0.05
    assert res.baseline.lower_bound <= res.baseline.prediction <= res.baseline.upper_bound

# -----------------------------------------------------------------------------
# TEST 3: Scenario Feature Transformation (Pure Function)
# -----------------------------------------------------------------------------
def test_scenario_feature_transformation():
    base_feats = {
        "days_since_last_served": 2.0,
        "food_frequency_7d": 3.0,
        "poll_vote_share_recent": 28.0,
        "historical_mean": 3.90
    }
    scenario_mod = {
        "days_since_last_served": 6.0,
        "food_frequency_7d": 1.0,
        "poll_vote_share_recent": 35.0
    }
    transformed = apply_scenario(base_feats, scenario_mod)
    
    # Original dictionary must be strictly unchanged (immutability)
    assert base_feats["days_since_last_served"] == 2.0
    assert base_feats["food_frequency_7d"] == 3.0
    
    # Transformed must reflect virtual adjustments
    assert transformed["days_since_last_served"] == 6.0
    assert transformed["food_frequency_7d"] == 1.0
    assert transformed["poll_vote_share_recent"] == 35.0
    assert transformed["historical_mean"] == 3.90

# -----------------------------------------------------------------------------
# TEST 4: Food Replacement Scenario (Rajma -> Chole)
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_food_replacement_scenario(engine):
    req = SimulationRequest(
        scenario_type="FOOD_REPLACEMENT",
        baseline_food="Rajma",
        scenario_food="Chole Bhature",
        simulation_date=date(2026, 6, 20),
        meal_type="Lunch",
        runs=500
    )
    res = await engine.simulate(req)
    assert res.scenario_type == "FOOD_REPLACEMENT"
    assert res.baseline.prediction is not None
    assert res.scenario.prediction is not None
    assert res.delta.mean_delta is not None
    assert res.delta.direction in ["POSITIVE", "NEGATIVE", "NEUTRAL"]
    assert len(res.key_tradeoffs) > 0

# -----------------------------------------------------------------------------
# TEST 5: Repetition Change Scenario
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_repetition_change_scenario(engine):
    req = SimulationRequest(
        scenario_type="REPETITION_CHANGE",
        baseline_food="Paneer Butter Masala",
        simulation_date=date(2026, 6, 20),
        meal_type="Dinner",
        repetition_delta_days=4,
        runs=500
    )
    res = await engine.simulate(req)
    assert res.scenario_type == "REPETITION_CHANGE"
    # Spacing out dish should maintain or improve satisfaction by easing repetition fatigue
    assert res.delta.mean_delta >= -0.05
    assert any("repetition" in a.lower() or "spacing" in a.lower() for a in res.assumptions + res.key_tradeoffs)

# -----------------------------------------------------------------------------
# TEST 6: Poll vs Repetition Separation
# -----------------------------------------------------------------------------
def test_poll_repetition_separation():
    base_feats = {
        "food_frequency_7d": 3.0,
        "days_since_last_served": 1.0,
        "poll_vote_share_recent": 40.0
    }
    
    # 1. Modify only repetition
    scen_rep = apply_scenario(base_feats, {"repetition_delta_days": 4})
    assert scen_rep["days_since_last_served"] == 5.0
    assert scen_rep["poll_vote_share_recent"] == 40.0  # poll preference unchanged
    
    # 2. Modify only poll preference
    scen_poll = apply_scenario(base_feats, {"poll_vote_share_recent": 15.0})
    assert scen_poll["poll_vote_share_recent"] == 15.0
    assert scen_poll["days_since_last_served"] == 1.0  # repetition unchanged

# -----------------------------------------------------------------------------
# TEST 7: Monte Carlo Distribution Generation
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_monte_carlo_distribution(engine):
    req = SimulationRequest(
        baseline_food="Aloo Gobi",
        scenario_food="Paneer Butter Masala",
        simulation_date=date(2026, 7, 1),
        runs=1000
    )
    res = await engine.simulate(req)
    dist = res.distribution
    assert dist.runs == 1000
    assert 1.0 <= dist.mean <= 5.0
    assert dist.std > 0
    assert 0.0 <= dist.probability_of_improvement <= 1.0
    assert 0.0 <= dist.probability_of_rating_drop <= 1.0
    assert abs((dist.probability_of_improvement + dist.probability_of_rating_drop) - 1.0) < 0.05

# -----------------------------------------------------------------------------
# TEST 8: Percentile Monotonicity
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_percentiles(engine):
    req = SimulationRequest(
        baseline_food="Dal Tadka",
        scenario_food="Mix Veg",
        simulation_date=date(2026, 7, 5),
        runs=1000
    )
    res = await engine.simulate(req)
    dist = res.distribution
    # Percentiles must strictly satisfy P10 <= P25 <= P50 <= P75 <= P90
    assert dist.p10 <= dist.p25 <= dist.p50 <= dist.p75 <= dist.p90
    assert res.scenario.p10 == dist.p10
    assert res.scenario.p50 == dist.p50
    assert res.scenario.p90 == dist.p90

# -----------------------------------------------------------------------------
# TEST 9: Uncertainty & Low-Data Guardrails
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_uncertainty_guardrails(engine):
    # Sooji Halwa is rare (0 reviews in active dining rotation)
    req = SimulationRequest(
        baseline_food="Aloo Paratha",
        scenario_food="Sooji Halwa",
        simulation_date=date(2026, 8, 1),
        meal_type="Breakfast",
        runs=500
    )
    res = await engine.simulate(req)
    assert res.confidence == "LOW"
    assert any("Low historical telemetry" in a or "warning" in a.lower() for a in res.assumptions)
    # Rare dish scenario interval width must be broad
    assert (res.scenario.upper_bound - res.scenario.lower_bound) >= 1.5

    # Multi-dish combination must also flag LOW confidence
    req_combo = SimulationRequest(
        baseline_meal=ScenarioMeal(meal="Breakfast", items=["Poori", "Chana"]),
        scenario_meal=ScenarioMeal(meal="Breakfast", items=["Poori", "Aloo Gobi"]),
        simulation_date=date(2026, 8, 1),
        runs=500
    )
    res_combo = await engine.simulate(req_combo)
    assert res_combo.scenario_type == "MEAL_COMBINATION"
    assert res_combo.confidence == "LOW"
    assert any("interaction terms" in a for a in res_combo.assumptions)

# -----------------------------------------------------------------------------
# TEST 10: Hard Safety Rule — ZERO Database Mutation on Operational Tables
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_no_database_mutation(engine):
    db = MesoDbClient()
    conn = db._get_connection()
    
    # Snapshot counts of operational tables before simulation
    operational_tables = ["daily_menu", "foods", "food_reviews", "complaints", "food_polls", "poll_votes", "poll_options", "users"]
    counts_before = {}
    with conn.cursor() as cur:
        for tbl in operational_tables:
            cur.execute(f"SELECT COUNT(*) AS cnt FROM {tbl}")
            counts_before[tbl] = cur.fetchone()["cnt"]

    # Execute simulation
    req = SimulationRequest(
        scenario_type="FOOD_REPLACEMENT",
        baseline_food="Rajma",
        scenario_food="Chole Bhature",
        simulation_date=date(2026, 9, 1),
        meal_type="Dinner",
        runs=1000
    )
    _ = await engine.simulate(req)

    # Snapshot counts of operational tables after simulation
    counts_after = {}
    with conn.cursor() as cur:
        for tbl in operational_tables:
            cur.execute(f"SELECT COUNT(*) AS cnt FROM {tbl}")
            counts_after[tbl] = cur.fetchone()["cnt"]

    # Assert 100% equality
    for tbl in operational_tables:
        assert counts_before[tbl] == counts_after[tbl], f"Operational table '{tbl}' was mutated during simulation!"

# -----------------------------------------------------------------------------
# TEST 11: API Integration (FastAPI Endpoint)
# -----------------------------------------------------------------------------
def test_api_simulation_endpoint(client):
    payload = {
        "simulation_name": "API Replacement Test",
        "scenario_type": "FOOD_REPLACEMENT",
        "simulation_date": "2026-06-25",
        "meal_type": "Dinner",
        "baseline_food": "Rajma",
        "scenario_food": "Chole Bhature",
        "runs": 500
    }
    
    # Test primary endpoint /api/v1/simulations
    res = client.post("/api/v1/simulations", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["simulation_id"].startswith("sim-")
    assert "baseline" in data
    assert "scenario" in data
    assert "delta" in data
    assert "distribution" in data
    assert data["distribution"]["runs"] == 500
    assert data["confidence"] in ["HIGH", "MEDIUM", "LOW"]

    # Test alias endpoint /v1/simulations
    res_alias = client.post("/v1/simulations", json=payload)
    assert res_alias.status_code == 200
