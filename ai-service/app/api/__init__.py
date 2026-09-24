"""
API route definitions for MESO AI microservice.
"""
from fastapi import APIRouter
from .investigations import router as investigations_router
from .forecasts import router as forecasts_router
from .simulations import router as simulations_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(investigations_router)
api_router.include_router(forecasts_router)
api_router.include_router(simulations_router)

__all__ = ["api_router"]
