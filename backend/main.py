from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from datetime import datetime

from models import ForecastResponse, MetricsResponse, ForecastData, ActualData
from services.elexon_api import ElexonAPIClient
from services.metrics import MetricsCalculator


app = FastAPI(title="UK Wind Power Forecasting API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/api/forecasts", response_model=ForecastResponse)
async def get_forecasts(
    from_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    to_date: str = Query(..., description="End date (YYYY-MM-DD)")
):
    """Get wind forecasts and actual generation for a date range."""
    client = ElexonAPIClient()

    try:
        forecasts_data = await client.fetch_forecasts(from_date, to_date)
        actuals_data = await client.fetch_actual_generation(from_date, to_date)

        # Convert to Pydantic models
        forecasts = []
        actuals = []
        
        for f in forecasts_data:
            try:
                forecasts.append(ForecastData(
                    startTime=f.get('startTime'),
                    generation=f.get('generation', 0),
                    publishTime=f.get('publishTime')
                ))
            except Exception as e:
                print(f"Error parsing forecast: {e}")

        for a in actuals_data:
            try:
                actuals.append(ActualData(
                    startTime=a.get('startTime'),
                    generation=a.get('generation', 0),
                    publishTime=a.get('publishTime')
                ))
            except Exception as e:
                print(f"Error parsing actual: {e}")

        await client.close()

        print("forcast ====>", forecasts)
        print("actuals ====>", actuals)
        
        return ForecastResponse(
            forecasts=forecasts,
            actuals=actuals,
            from_date=from_date,
            to_date=to_date
        )
    except Exception as e:
        await client.close()
        return ForecastResponse(
            forecasts=[],
            actuals=[],
            from_date=from_date,
            to_date=to_date
        )


@app.get("/api/metrics", response_model=MetricsResponse)
async def get_metrics(
    from_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    to_date: str = Query(..., description="End date (YYYY-MM-DD)")
):
    """Get forecast accuracy metrics (MAE, RMSE, MAPE)."""
    client = ElexonAPIClient()

    try:
        forecasts_data = await client.fetch_forecasts(from_date, to_date)
        actuals_data = await client.fetch_actual_generation(from_date, to_date)

        metrics = MetricsCalculator.calculate_all(forecasts_data, actuals_data)

        await client.close()

        return MetricsResponse(
            mae=metrics["mae"],
            rmse=metrics["rmse"],
            mape=metrics["mape"],
            data_points=metrics["data_points"],
            from_date=from_date,
            to_date=to_date
        )
    except Exception as e:
        await client.close()
        return MetricsResponse(
            mae=0.0,
            rmse=0.0,
            mape=0.0,
            data_points=0,
            from_date=from_date,
            to_date=to_date
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
