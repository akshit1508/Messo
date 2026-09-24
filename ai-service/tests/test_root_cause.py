"""
Unit & Integration Test Suite for MESO Root Cause Engine (AI Batch 2).
Covers:
1. Rating decline detection
2. Oiliness scenario (Scenario A)
3. Repetition scenario (Scenario B, Window 1)
4. Repetition counterexample (Scenario B, Window 2 - Negative/False-positive test)
5. Meal-specific concentration (Scenario C)
6. Temporary anomaly vs chronic trend (Scenario D)
7. No meaningful change (stability test)
"""

import sys
import os
import asyncio
from datetime import date
import pytest

# Ensure app is importable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.engines.root_cause import RootCauseEngine
from app.data.schemas import InvestigationRequest

@pytest.fixture
def engine():
    return RootCauseEngine()

@pytest.mark.asyncio
async def test_1_rating_decline_detection(engine):
    """
    Verifies that the engine detects a statistically significant rating decline.
    """
    req = InvestigationRequest(
        metric="food_satisfaction",
        start_date=date(2026, 5, 22), # Scenario A window
        end_date=date(2026, 6, 21),
        comparison_start_date=date(2026, 4, 21),
        comparison_end_date=date(2026, 5, 21)
    )
    res = await engine.investigate(req)
    assert res.metric_summary.change < 0
    assert res.metric_summary.statistically_significant is True
    assert len(res.observations) > 0
    assert len(res.evidence) > 0
    print("\n[Test 1 Passed] Rating decline detected:", res.metric_summary.change)

@pytest.mark.asyncio
async def test_2_oiliness_scenario(engine):
    """
    Scenario A: Dal Tadka / Dal Fry high frequency, steep rating drop, oil complaints spike.
    Expected: HIGH_OIL_PREPARATION factor with HIGH or MEDIUM confidence.
    """
    req = InvestigationRequest(
        metric="food_satisfaction",
        start_date=date(2026, 5, 22),
        end_date=date(2026, 6, 21),
        comparison_start_date=date(2026, 4, 21),
        comparison_end_date=date(2026, 5, 21)
    )
    res = await engine.investigate(req)
    factor_ids = [f.factor_id for f in res.possible_factors]
    assert "HIGH_OIL_PREPARATION" in factor_ids
    
    oil_factor = next(f for f in res.possible_factors if f.factor_id == "HIGH_OIL_PREPARATION")
    assert oil_factor.confidence in ["HIGH", "MEDIUM"]
    assert len(oil_factor.supporting_evidence_indices) > 0
    print("\n[Test 2 Passed] Oiliness factor identified:", oil_factor.description, "Confidence:", oil_factor.confidence)

@pytest.mark.asyncio
async def test_3_repetition_scenario_window1(engine):
    """
    Scenario B (Window 1): High Paneer Butter Masala frequency + repetition complaints + low poll preference.
    Expected: MENU_REPETITION_FATIGUE factor.
    """
    req = InvestigationRequest(
        metric="food_satisfaction",
        start_date=date(2026, 1, 23),
        end_date=date(2026, 2, 22),
        comparison_start_date=date(2025, 12, 23),
        comparison_end_date=date(2026, 1, 22)
    )
    res = await engine.investigate(req)
    factor_ids = [f.factor_id for f in res.possible_factors]
    assert "MENU_REPETITION_FATIGUE" in factor_ids

    rep_factor = next(f for f in res.possible_factors if f.factor_id == "MENU_REPETITION_FATIGUE")
    assert rep_factor.confidence in ["HIGH", "MEDIUM"]
    print("\n[Test 3 Passed] Repetition fatigue factor identified:", rep_factor.description)

@pytest.mark.asyncio
async def test_4_repetition_counterexample_window2(engine):
    """
    Scenario B (Window 2): High Paneer Butter Masala frequency during celebration/exam month.
    Poll preference remains HIGH (> 15%) and repetition complaints are low.
    Expected: Engine MUST NOT identify MENU_REPETITION_FATIGUE (False Positive Prevention).
    """
    req = InvestigationRequest(
        metric="food_satisfaction",
        start_date=date(2026, 7, 31),
        end_date=date(2026, 8, 20),
        comparison_start_date=date(2026, 7, 10),
        comparison_end_date=date(2026, 7, 30)
    )
    res = await engine.investigate(req)
    factor_ids = [f.factor_id for f in res.possible_factors]
    assert "MENU_REPETITION_FATIGUE" not in factor_ids
    print("\n[Test 4 Passed] Counterexample correctly avoided false positive. Repetition fatigue was NOT flagged.")

@pytest.mark.asyncio
async def test_5_meal_specific_concentration(engine):
    """
    Scenario C: Dinner ratings drop while Breakfast and Lunch remain stable.
    Expected: DINNER_SERVICE_CONCENTRATION factor.
    """
    req = InvestigationRequest(
        metric="food_satisfaction",
        start_date=date(2025, 11, 24),
        end_date=date(2025, 12, 24),
        comparison_start_date=date(2025, 10, 24),
        comparison_end_date=date(2025, 11, 23)
    )
    res = await engine.investigate(req)
    factor_ids = [f.factor_id for f in res.possible_factors]
    assert "DINNER_SERVICE_CONCENTRATION" in factor_ids
    print("\n[Test 5 Passed] Meal-specific concentration identified in Dinner.")

@pytest.mark.asyncio
async def test_6_temporary_anomaly(engine):
    """
    Scenario D: Acute 8-day dip with water disruption and immediate recovery.
    Expected: TEMPORARY_OPERATIONAL_ANOMALY factor.
    """
    req = InvestigationRequest(
        metric="food_satisfaction",
        start_date=date(2026, 3, 24),
        end_date=date(2026, 3, 31),
        comparison_start_date=date(2026, 3, 16),
        comparison_end_date=date(2026, 3, 23)
    )
    res = await engine.investigate(req)
    factor_ids = [f.factor_id for f in res.possible_factors]
    assert "TEMPORARY_OPERATIONAL_ANOMALY" in factor_ids
    print("\n[Test 6 Passed] Temporary operational anomaly distinguished from chronic trend.")

@pytest.mark.asyncio
async def test_7_no_meaningful_change(engine):
    """
    Stability test: When there is no meaningful change (|diff| < 0.15),
    engine returns stability observation and NO fabricated factors.
    """
    req = InvestigationRequest(
        metric="food_satisfaction",
        start_date=date(2025, 10, 5),
        end_date=date(2025, 10, 20),
        comparison_start_date=date(2025, 10, 21),
        comparison_end_date=date(2025, 11, 5)
    )
    res = await engine.investigate(req)
    assert len(res.possible_factors) == 0
    assert any("normal historical fluctuations" in obs or "no statistically significant" in obs for obs in res.observations)
    print("\n[Test 7 Passed] Stability test passed. No factors fabricated when metrics are steady.")

if __name__ == "__main__":
    async def main():
        e = RootCauseEngine()
        print("Running all 7 Root Cause Engine integration tests...")
        await test_1_rating_decline_detection(e)
        await test_2_oiliness_scenario(e)
        await test_3_repetition_scenario_window1(e)
        await test_4_repetition_counterexample_window2(e)
        await test_5_meal_specific_concentration(e)
        await test_6_temporary_anomaly(e)
        await test_7_no_meaningful_change(e)
        print("\nAll 7 tests passed successfully!")

    asyncio.run(main())
