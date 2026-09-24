"""
API route definitions for MESO AI microservice.
Supports both /api/v1 and /v1 conventions.
"""
from fastapi import APIRouter
from .investigations import router as investigations_router
from .forecasts import router as forecasts_router
from .simulations import router as simulations_router

# Common router without prefix
common_router = APIRouter()
common_router.include_router(investigations_router)
common_router.include_router(forecasts_router)
common_router.include_router(simulations_router)

# Prefix routers
api_router = APIRouter(prefix="/api/v1")
api_router.include_router(common_router)

v1_router = APIRouter(prefix="/v1")
v1_router.include_router(common_router)

__all__ = ["api_router", "v1_router", "common_router"]
