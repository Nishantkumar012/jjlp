"""Configuration for forecast data retrieval."""

# Forecast retrieval window - expanded range to capture historical data
# We fetch from Dec 1, 2025 to Feb 1, 2026 to ensure we get Jan 2026 forecasts
FORECAST_RETRIEVAL_START = "2025-12-01T00:00:00Z"
FORECAST_RETRIEVAL_END = "2026-02-01T00:00:00Z"

# Delivery interval filtering - we want only January 2026 data
# Filter by startTime to keep only delivery intervals in this range
DELIVERY_INTERVAL_START = "2026-01-01T00:00:00Z"
DELIVERY_INTERVAL_END = "2026-02-01T00:00:00Z"
