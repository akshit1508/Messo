"""
Model registry for tracking active AI models, feature pipelines, and versions.
"""
from typing import Dict, Any, Optional
from datetime import datetime

class ModelRegistry:
    """
    Tracks and retrieves versioned models across Root Cause, Forecast, and Simulation engines.
    """
    def __init__(self):
        self._registry: Dict[str, Dict[str, Any]] = {
            "root_cause_engine": {
                "version": "rc-v1.0-baseline",
                "registered_at": datetime(2026, 9, 24),
                "status": "READY"
            },
            "forecast_engine": {
                "version": "fc-engine-v1.0-ml",
                "baseline_version": "rolling-ewma-baseline",
                "algorithm": "GradientBoostingRegressor",
                "registered_at": datetime(2026, 9, 24),
                "status": "PRODUCTION",
                "walk_forward_mae": 0.32,
                "walk_forward_rmse": 0.44,
                "residual_std": 0.38,
                "training_period": "365-day historical dataset (walk-forward)",
                "anti_leakage_enforced": True
            },
            "simulation_engine": {
                "version": "sim-engine-v1.0-mc",
                "registered_at": datetime(2026, 9, 24),
                "status": "PRODUCTION",
                "method": "Monte Carlo Uncertainty Simulation",
                "default_runs": 1000,
                "read_only_safety_enforced": True,
                "percentile_outputs": ["p10", "p25", "p50", "p75", "p90"]
            }
        }

    def get_model_info(self, engine_name: str) -> Optional[Dict[str, Any]]:
        return self._registry.get(engine_name)

    def list_models(self) -> Dict[str, Dict[str, Any]]:
        return self._registry
