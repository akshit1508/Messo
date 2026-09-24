"""
FastAPI endpoints for Root Cause Engine investigations.
"""
from fastapi import APIRouter, HTTPException, Depends
from app.data.schemas import InvestigationRequest, InvestigationResponse
from app.engines.root_cause import RootCauseEngine

router = APIRouter(prefix="/investigations", tags=["Root Cause Engine"])

def get_engine() -> RootCauseEngine:
    return RootCauseEngine()

@router.post("", response_model=InvestigationResponse)
async def create_investigation(
    request: InvestigationRequest,
    engine: RootCauseEngine = Depends(get_engine)
):
    """
    Triggers a causal investigation into a target metric variation.
    """
    try:
        return await engine.investigate(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
