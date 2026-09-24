"""
Main entry point for MESO AI microservice (FastAPI).
Serves Root Cause Engine, Forecast Engine, and Simulation Engine endpoints.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import api_router, v1_router

app = FastAPI(
    title="MESO AI Intelligence Service",
    description="Microservice providing Root Cause Analysis, Forecasting, and Simulation for MESO Hostel Mess Management.",
    version="0.2.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Internal CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes (supporting both /api/v1 and /v1)
app.include_router(api_router)
app.include_router(v1_router)

@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "UP",
        "service": "meso-ai-service",
        "version": "0.2.0"
    }

@app.get("/", tags=["System"])
async def root():
    return {
        "message": "Welcome to MESO AI Intelligence Microservice",
        "docs": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
