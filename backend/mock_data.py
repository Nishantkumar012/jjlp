"""Mock data for testing - simulates historical January 2026 wind data."""

from datetime import datetime, timedelta

def generate_mock_january_2026_forecasts():
    """Generate realistic mock forecast data for January 2026."""
    forecasts = []
    base_date = datetime(2026, 1, 1, 0, 0, 0)

    # Generate hourly forecasts for all of January 2026 (744 hours)
    for hour in range(744):  # 31 days * 24 hours
        timestamp = base_date + timedelta(hours=hour)
        iso_time = timestamp.strftime('%Y-%m-%dT%H:%M:%SZ')

        # Generate realistic wind generation values (0-20000 MW)
        # Pattern: higher at night, lower during day
        hour_of_day = timestamp.hour
        base_generation = 8000 + (hour_of_day % 12) * 1000

        forecasts.append({
            "dataset": "WINDFOR",
            "startTime": iso_time,
            "generation": base_generation + (hour % 3) * 500,
            "publishTime": (timestamp - timedelta(hours=12)).strftime('%Y-%m-%dT%H:%M:%SZ')
        })

    return forecasts


def generate_mock_january_2026_actuals():
    """Generate realistic mock actual generation data for January 2026."""
    actuals = []
    base_date = datetime(2026, 1, 1, 0, 0, 0)

    # Generate 30-minute intervals for all of January 2026 (1488 records)
    for interval in range(1488):  # 31 days * 48 half-hours
        timestamp = base_date + timedelta(minutes=30 * interval)
        iso_time = timestamp.strftime('%Y-%m-%dT%H:%M:%SZ')

        # Generate realistic wind generation values
        hour_of_day = timestamp.hour
        base_generation = 8500 + (hour_of_day % 12) * 800

        actuals.append({
            "dataset": "FUELHH",
            "startTime": iso_time,
            "generation": base_generation + (interval % 5) * 400,
            "publishTime": (timestamp + timedelta(hours=2)).strftime('%Y-%m-%dT%H:%M:%SZ')
        })

    return actuals
