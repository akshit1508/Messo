"""
Comprehensive Test Suite for MESO AI Forecast Engine (AI Batch 3).
Verifies:
1. Feature generation
2. Temporal leakage prevention
3. Baseline EWMA prediction
4. ML model prediction (Gradient Boosting)
5. Walk-forward backtesting
6. MAE / RMSE calculation
7. Prediction intervals (empirical residual calibration)
8. Low-data / rare food handling
9. Missing data handling
10. Forecast API endpoint integration
11. Secondary targets (Complaint Volume & Poll Participation)
"""

import sys
import os
import pytest
from datetime import date, timedelta
from starlette.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.engines.forecast import ForecastEngine
from app.data.schemas import ForecastRequest, ForecastResponse
from app.data.client import MesoDbClient
from app.main import app

@pytest.fixture
def engine():
    return ForecastEngine()

@pytest.fixture
def client():
    return TestClient(app)

# -----------------------------------------------------------------------------
# TEST 1: Feature Generation
# -----------------------------------------------------------------------------
def test_feature_generation(engine):
    cutoff = date(2026, 5, 1)
    features, status, count = engine.build_features_for_food("Paneer Butter Masala", cutoff, "Dinner")
    assert isinstance(features, dict)
    expected_keys = [
        "historical_mean", "ewma_rating_7d", "days_since_last_served",
        "recent_complaints_14d", "dish_complaint_rate_14d", "day_of_week",
        "is_weekend", "meal_type_Dinner", "category_mean"
    ]
    for key in expected_keys:
        assert key in features, f"Missing feature key: {key}"
    assert count > 0
    assert status in ["SUFFICIENT", "LIMITED"]

# -----------------------------------------------------------------------------
# TEST 2: Temporal Leakage Prevention
# -----------------------------------------------------------------------------
def test_temporal_anti_leakage(engine):
    # Features built with cutoff date T must only access reviews from before T
    cutoff_early = date(2026, 1, 1)
    cutoff_late = date(2026, 6, 1)
    
    feats_early, status_early, count_early = engine.build_features_for_food("Paneer Butter Masala", cutoff_early)
    feats_late, status_late, count_late = engine.build_features_for_food("Paneer Butter Masala", cutoff_late)
    
    # Historical review count at later date must be strictly greater than earlier date
    assert count_late > count_early, "Later cutoff should have accumulated strictly more reviews"
    
    # Verify directly via DB client that querying with cutoff yields 0 records >= cutoff
    db_reviews = engine.db.get_reviews(cutoff_early - timedelta(days=30), cutoff_early - timedelta(days=1))
    if not db_reviews.empty:
        max_review_date = db_reviews["review_date"].max()
        assert max_review_date < cutoff_early, f"Leakage detected: review date {max_review_date} >= cutoff {cutoff_early}"

# -----------------------------------------------------------------------------
# TEST 3: Baseline EWMA Prediction
# -----------------------------------------------------------------------------
def test_baseline_ewma_prediction(engine):
    mock_features = {
        "ewma_rating_7d": 4.10,
        "historical_mean": 3.90,
        "days_since_last_served": 5.0,
        "dish_complaint_rate_14d": 0.05,
        "is_weekend": 0.0
    }
    pred = engine.predict_baseline_ewma(mock_features)
    assert 1.0 <= pred <= 5.0
    # Expected weighted combination of recent EWMA and historical mean
    assert 3.8 <= pred <= 4.2

# -----------------------------------------------------------------------------
# TEST 4: ML Model Prediction (Gradient Boosting)
# -----------------------------------------------------------------------------
def test_ml_model_prediction(engine):
    cutoff = date(2026, 6, 1)
    features, status, _ = engine.build_features_for_food("Dal Tadka", cutoff, "Lunch")
    pred, top_feats = engine.predict_ml(features)
    assert 1.0 <= pred <= 5.0
    assert isinstance(top_feats, list)
    assert len(top_feats) > 0
    assert any("name" in tf and "importance" in tf for tf in top_feats)

# -----------------------------------------------------------------------------
# TEST 5: Walk-Forward Backtesting
# -----------------------------------------------------------------------------
def test_walk_forward_backtest(engine):
    # Run a compact 3-step walk-forward backtest
    results = engine.evaluate_walk_forward(
        food_name="Paneer Butter Masala",
        start_cutoff=date(2026, 3, 1),
        steps=3,
        step_days=14
    )
    assert len(results) == 3
    for step in results:
        assert "cutoff_date" in step
        assert "actual_rating" in step
        assert "baseline_pred" in step
        assert "ml_pred" in step
        assert "baseline_error" in step
        assert "ml_error" in step

# -----------------------------------------------------------------------------
# TEST 6: MAE / RMSE Calculation
# -----------------------------------------------------------------------------
def test_metric_calculation(engine):
    mae_b, rmse_b, mae_m, rmse_m = engine.compute_benchmark_metrics()
    assert mae_b > 0
    assert rmse_b > 0
    assert mae_m > 0
    assert rmse_m > 0
    # Gradient boosting model must outperform baseline on historical data
    assert mae_m <= mae_b
    assert rmse_m <= rmse_b

# -----------------------------------------------------------------------------
# TEST 7: Prediction Intervals (Residual Calibrated)
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_prediction_intervals(engine):
    req = ForecastRequest(
        target="food_rating",
        food_name="Aloo Gobi",
        forecast_date=date(2026, 7, 1),
        meal_type="Dinner",
        horizon_days=3
    )
    res = await engine.predict(req)
    assert res.prediction is not None
    assert res.lower_bound <= res.prediction <= res.upper_bound
    # Interval width must not be trivial zero or hardcoded +/-0.3
    interval_width = res.upper_bound - res.lower_bound
    assert 0.8 <= interval_width <= 2.5
    for dp in res.data_points:
        assert dp.confidence_interval_lower <= dp.predicted_value <= dp.confidence_interval_upper

# -----------------------------------------------------------------------------
# TEST 8: Low-Data / Rare Food Handling
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_low_data_handling(engine):
    # "Sooji Halwa" has 0 reviews in historical dataset
    req = ForecastRequest(
        target="food_rating",
        food_name="Sooji Halwa",
        forecast_date=date(2026, 8, 1),
        meal_type="Breakfast",
        horizon_days=1
    )
    res = await engine.predict(req)
    assert res.data_status in ["NO_HISTORY", "INSUFFICIENT_DATA"]
    assert res.confidence == "LOW"
    # Must include honest low-data warning assumptions
    assert any("Low historical sample size" in a or "Warning" in a for a in res.assumptions)
    # Interval must be significantly wider for uncertain low-data dishes
    assert (res.upper_bound - res.lower_bound) >= 1.5

# -----------------------------------------------------------------------------
# TEST 9: Missing Data Handling
# -----------------------------------------------------------------------------
def test_missing_data_imputation(engine):
    # Food with no served menu history or complaints
    features, status, count = engine.build_features_for_food("NonExistentSpecialDish", date(2026, 6, 1))
    assert status == "NO_HISTORY"
    assert count == 0
    # Clean fallback priors without NaN or crashing
    assert features["historical_mean"] == 3.50
    assert features["days_since_last_served"] == 14.0
    assert features["dish_complaint_rate_14d"] == 0.0

# -----------------------------------------------------------------------------
# TEST 10: Forecast API Endpoint (FastAPI)
# -----------------------------------------------------------------------------
def test_api_forecast_endpoint(client):
    payload = {
        "target": "food_rating",
        "food_name": "Chole Bhature",
        "forecast_date": "2026-06-15",
        "meal_type": "Lunch",
        "horizon_days": 3
    }
    res = client.post("/api/v1/forecasts", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["forecast_id"].startswith("fc-")
    assert data["target"] == "food_rating"
    assert data["entity"] == "Chole Bhature"
    assert data["prediction"] is not None
    assert data["confidence"] in ["HIGH", "MEDIUM", "LOW"]
    assert len(data["data_points"]) == 3
    assert len(data["assumptions"]) > 0

# -----------------------------------------------------------------------------
# TEST 11: Secondary Targets: Complaint Volume & Poll Participation
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_secondary_targets(engine):
    # Complaint volume
    c_req = ForecastRequest(
        target="complaint_volume",
        forecast_date=date(2026, 7, 10),
        horizon_days=2
    )
    c_res = await engine.predict(c_req)
    assert c_res.target == "complaint_volume"
    assert c_res.prediction >= 0.0
    assert c_res.lower_bound <= c_res.prediction <= c_res.upper_bound
    
    # Poll participation
    p_req = ForecastRequest(
        target="poll_participation",
        forecast_date=date(2026, 7, 10),
        horizon_days=2
    )
    p_res = await engine.predict(p_req)
    assert p_res.target == "poll_participation"
    assert p_res.prediction > 0.0
    assert p_res.lower_bound <= p_res.prediction <= p_res.upper_bound
