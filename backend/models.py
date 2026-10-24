from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional


class ForecastData(BaseModel):
    startTime: datetime
    generation: float
    publishTime: datetime


class ActualData(BaseModel):
    startTime: datetime
    generation: float
    publishTime: datetime


class ForecastResponse(BaseModel):
    forecasts: List[ForecastData]
    actuals: List[ActualData]
    from_date: str
    to_date: str


class MetricsResponse(BaseModel):
    mae: float
    rmse: float
    mape: float
    data_points: int
    from_date: str
    to_date: str
