from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.forecast import router as forecast_router

app = FastAPI(
    title="GrowMark ML API",
    description="Sales Forecasting for Small Enterprises",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(forecast_router, prefix="/forecast", tags=["Sales Forecasting"])

@app.get("/")
def root():
    return {
        "service": "GrowMark ML Backend",
        "status": "running",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
