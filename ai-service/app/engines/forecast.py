"""
Forecast Engine Interface & Skeleton (Batch 1 Foundation).
Full time-series and predictive modeling will be implemented in AI Batch 3.
"""
from typing import List
import uuid
from datetime import datetime, timedelta
from app.data.schemas import (
    ForecastRequest,
    ForecastResponse,
    ForecastDataPoint
)

class ForecastEngine:
    """
    Interface definition for Forecast Engine - 'WHAT NEXT?'
    Generates multi-day horizons for mess food metrics and demand.
    """
    def __init__(self, model_version: str = "fc-engine-v1.0-skeleton"):
        self.model_version = model_version

    async def predict(self, request: ForecastRequest) -> ForecastResponse:
        forecast_id = f"fc-{uuid.uuid4().hex[:8]}"
        today = datetime.utcnow().date()
        data_points: List[ForecastDataPoint] = []

        for day in range(1, request.horizon_days + 1):
            target_date = today + timedelta(days=day)
            for m in request.metrics:
                base = 4.0 if "rating" in m else 0.15
                data_points.append(
                    ForecastDataPoint(
                        forecast_date=target_date,
                        metric=m,
                        predicted_value=base,
                        confidence_interval_lower=base - 0.3,
                        confidence_interval_upper=base + 0.3
                    )
                )

        return ForecastResponse(
            forecast_id=forecast_id,
            food_name=request.food_name,
            horizon_days=request.horizon_days,
            data_points=data_points,
            assumptions=[
                "Assumes consistent student attendance distribution",
                "Assumes no major kitchen supply disruption"
            ],
            model_version=self.model_version,
            computed_at=datetime.utcnow()
        )
