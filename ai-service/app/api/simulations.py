"""
FastAPI endpoints for Simulation Engine.
"""
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query
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
    Executes advisory What-If simulation with Monte Carlo uncertainty analysis.
    """
    try:
        return await engine.simulate(request)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history", response_model=List[Dict[str, Any]])
async def get_simulation_history(
    limit: int = Query(default=15, ge=1, le=50),
    engine: SimulationEngine = Depends(get_engine)
):
    """
    Retrieves recent simulation audit records from the ai_simulation table.
    """
    try:
        return engine.db.get_recent_simulations(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/foods", response_model=List[Dict[str, Any]])
async def get_available_foods(
    engine: SimulationEngine = Depends(get_engine)
):
    """
    Returns active food catalog for scenario selection.
    """
    try:
        df = engine.db.get_foods()
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
