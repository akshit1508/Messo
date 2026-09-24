"""
FastAPI endpoints for Simulation Engine.
"""
from fastapi import APIRouter, HTTPException, Depends
from app.data.schemas import SimulationRequest, SimulationResponse
from app.engines.simulation import SimulationEngine

router = APIRouter(prefix="/simulations", tags=["Simulation Engine"])

def get_engine() -> SimulationEngine:
    return SimulationEngine()

@router.post("", response_model=SimulationResponse)
async def run_simulation(
    request: SimulationRequest,
    engine: SimulationEngine = Depends(get_engine)
):
    """
    Simulates proposed menu schedules or changes.
    """
    try:
        return await engine.simulate(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
