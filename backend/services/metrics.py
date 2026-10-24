from typing import List, Dict, Any, Tuple
from datetime import datetime
import math


class MetricsCalculator:
    """Calculate forecast accuracy metrics: MAE, RMSE, MAPE."""

    @staticmethod
    def align_data(forecasts: List[Dict[str, Any]], actuals: List[Dict[str, Any]]) -> Tuple[List[float], List[float]]:
        """Align forecast and actual data by startTime."""
        # Create dictionaries keyed by startTime
        forecast_dict = {}
        actual_dict = {}

        for f in forecasts:
            start_time = f.get('startTime')
            if start_time:
                if isinstance(start_time, str):
                    start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                forecast_dict[start_time] = f.get('generation', 0)

        for a in actuals:
            start_time = a.get('startTime')
            if start_time:
                if isinstance(start_time, str):
                    start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                actual_dict[start_time] = a.get('generation', 0)

        # Find common timestamps
        common_times = set(forecast_dict.keys()) & set(actual_dict.keys())

        if not common_times:
            return [], []

        forecast_values = []
        actual_values = []

        for time in sorted(common_times):
            forecast_values.append(forecast_dict[time])
            actual_values.append(actual_dict[time])

        return forecast_values, actual_values

    @staticmethod
    def calculate_mae(forecasts: List[float], actuals: List[float]) -> float:
        """Calculate Mean Absolute Error."""
        if not forecasts or len(forecasts) != len(actuals):
            return 0.0

        errors = [abs(f - a) for f, a in zip(forecasts, actuals)]
        return sum(errors) / len(errors)

    @staticmethod
    def calculate_rmse(forecasts: List[float], actuals: List[float]) -> float:
        """Calculate Root Mean Square Error."""
        if not forecasts or len(forecasts) != len(actuals):
            return 0.0

        squared_errors = [(f - a) ** 2 for f, a in zip(forecasts, actuals)]
        mean_squared_error = sum(squared_errors) / len(squared_errors)
        return math.sqrt(mean_squared_error)

    @staticmethod
    def calculate_mape(forecasts: List[float], actuals: List[float]) -> float:
        """Calculate Mean Absolute Percentage Error."""
        if not forecasts or len(forecasts) != len(actuals):
            return 0.0

        # Filter out zero actuals to avoid division by zero
        valid_pairs = [(f, a) for f, a in zip(forecasts, actuals) if a != 0]

        if not valid_pairs:
            return 0.0

        percentage_errors = [abs((f - a) / a) for f, a in valid_pairs]
        return (sum(percentage_errors) / len(percentage_errors)) * 100

    @staticmethod
    def calculate_all(forecasts: List[Dict[str, Any]], actuals: List[Dict[str, Any]]) -> Dict[str, float]:
        """Calculate all metrics."""
        forecast_values, actual_values = MetricsCalculator.align_data(forecasts, actuals)

        return {
            "mae": MetricsCalculator.calculate_mae(forecast_values, actual_values),
            "rmse": MetricsCalculator.calculate_rmse(forecast_values, actual_values),
            "mape": MetricsCalculator.calculate_mape(forecast_values, actual_values),
            "data_points": len(forecast_values)
        }
