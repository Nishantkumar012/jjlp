from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

from models import ForecastResponse, MetricsResponse, ForecastData, ActualData
from services.elexon_api import ElexonAPIClient
from services.metrics import MetricsCalculator


app = FastAPI(title="UK Wind Power Forecasting API", version="1.0.0")

# Get CORS origins from environment variable or use default
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/api/forecasts-historical")
async def get_forecasts_historical(
    from_date: str = Query("2026-01-01", description="Start date (YYYY-MM-DD)"),
    to_date: str = Query("2026-01-31", description="End date (YYYY-MM-DD)")
):
    """
    Get historical wind forecasts for specified date range.

    Uses expanded retrieval window to fetch forecasts published before and during
    the specified dates. Results filtered to only include delivery intervals within
    the requested date range.
    """
    client = ElexonAPIClient()

    try:
        print(f"\n📊 REQUEST: /api/forecasts-historical from_date={from_date}, to_date={to_date}")

        # Fetch historical forecasts using specified date range
        forecasts_data = await client.fetch_forecasts_historical(from_date, to_date)

        # Fetch actual generation for specified date range
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

        print(f"✅ Returning {len(forecasts)} forecasts and {len(actuals)} actuals for {from_date} to {to_date}")

        return ForecastResponse(
            forecasts=forecasts,
            actuals=actuals,
            from_date=from_date,
            to_date=to_date
        )
    except Exception as e:
        print(f"❌ Error in /api/forecasts-historical: {e}")
        await client.close()
        return ForecastResponse(
            forecasts=[],
            actuals=[],
            from_date=from_date,
            to_date=to_date
        )


@app.get("/api/debug")
async def debug_api():
    """Debug endpoint to test Elexon API directly."""
    client = ElexonAPIClient()
    try:
        # Test with January 2026
        from_date = "2026-01-01"
        to_date = "2026-01-31"

        print(f"\n🔍 DEBUG TEST: Fetching data from {from_date} to {to_date}")

        forecasts = await client.fetch_forecasts(from_date, to_date)
        actuals = await client.fetch_actual_generation(from_date, to_date)

        await client.close()

        return {
            "request": {
                "from_date": from_date,
                "to_date": to_date
            },
            "forecasts_count": len(forecasts),
            "actuals_count": len(actuals),
            "first_forecast": forecasts[0] if forecasts else None,
            "first_actual": actuals[0] if actuals else None,
            "last_forecast": forecasts[-1] if forecasts else None,
            "last_actual": actuals[-1] if actuals else None
        }
    except Exception as e:
        await client.close()
        return {
            "error": str(e)
        }


@app.get("/api/forecasts", response_model=ForecastResponse)
async def get_forecasts(
    from_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    to_date: str = Query(..., description="End date (YYYY-MM-DD)")
):
    """Get wind forecasts and actual generation for a date range."""
    print(f"\n🔍 REQUEST: /api/forecasts from_date={from_date}, to_date={to_date}")
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
