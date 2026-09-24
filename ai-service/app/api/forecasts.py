"""
FastAPI endpoints for Forecast Engine.
"""
from fastapi import APIRouter, HTTPException, Depends
from app.data.schemas import ForecastRequest, ForecastResponse
from app.engines.forecast import ForecastEngine

router = APIRouter(prefix="/forecasts", tags=["Forecast Engine"])

def get_engine() -> ForecastEngine:
    return ForecastEngine()

@router.post("", response_model=ForecastResponse)
async def generate_forecast(
    request: ForecastRequest,
    engine: ForecastEngine = Depends(get_engine)
):
    """
    Generates multi-day forecast for mess food metrics.
    """
    try:
        return await engine.predict(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
