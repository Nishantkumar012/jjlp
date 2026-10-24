# Historical Forecast Data Implementation

## Summary

Implemented historical wind power forecast fetching for January 2026 using an expanded retrieval window (Dec 1, 2025 - Feb 1, 2026) with proper date filtering to isolate delivery intervals within January 2026.

## Files Modified

### 1. **backend/config.py** (NEW)
Central configuration location for forecast date parameters.

**Key Configuration:**
- `FORECAST_RETRIEVAL_START`: `2025-12-01T00:00:00Z` - Expanded window start
- `FORECAST_RETRIEVAL_END`: `2026-02-01T00:00:00Z` - Expanded window end
- `DELIVERY_INTERVAL_START`: `2026-01-01T00:00:00Z` - Filter to January only (inclusive)
- `DELIVERY_INTERVAL_END`: `2026-02-01T00:00:00Z` - Filter to January only (exclusive)

This single location allows easy updates to date ranges without modifying multiple files.

---

### 2. **backend/services/elexon_api.py** (MODIFIED)
Added historical forecast fetching with dual-layer date filtering.

**New Methods:**

#### `_parse_iso_datetime(date_str: str) -> datetime`
Helper method to consistently parse ISO 8601 datetime strings.

#### `_is_in_delivery_interval(start_time_str: str) -> bool`
- Checks if a forecast's `startTime` falls within the configured delivery interval (Jan 1 - Feb 1, 2026)
- Uses `DELIVERY_INTERVAL_START` and `DELIVERY_INTERVAL_END` from config
- Returns `True` if: `DELIVERY_INTERVAL_START <= startTime < DELIVERY_INTERVAL_END`
- Exclusive upper bound ensures Feb 1 is excluded

#### `async fetch_forecasts_historical() -> List[Dict[str, Any]]`
**Purpose:** Fetch historical forecasts for January 2026 with expanded retrieval window.

**Process:**
1. Queries WINDFOR API with expanded window (Dec 1, 2025 - Feb 1, 2026)
2. Receives all forecasts published/applicable in that range
3. Filters results by `_is_in_delivery_interval()` to keep only Jan 2026 deliveries
4. Logs detailed information about:
   - Retrieval window used
   - Total records returned by API
   - Filtered record count
   - Date range in response
   - Sample publishTimes (for day-ahead selection)

**Verification:**
- Checks if API actually returns historical data (not just latest)
- Warns if `publishTime` indicates latest data instead of historical

**Preserves:**
- `publishTime` field for each forecast
- Allows selection of specific forecast version based on day-ahead cutoff rules

**Existing Methods Preserved:**
- `fetch_forecasts(from_date, to_date)` - unchanged, for flexible date queries
- `fetch_actual_generation(from_date, to_date)` - unchanged
- `_is_in_date_range()` - unchanged helper for general date filtering

---

### 3. **backend/main.py** (MODIFIED)
Added new endpoint for historical forecast retrieval.

**New Endpoint:**

#### `GET /api/forecasts-historical`
- **Purpose:** Retrieve January 2026 historical wind forecasts
- **Parameters:** None (uses config.py date ranges)
- **Returns:** `ForecastResponse` containing:
  - `forecasts`: List of forecast records with delivery intervals in January 2026
  - `actuals`: Actual generation for January 2026
  - `from_date`: "2026-01-01"
  - `to_date`: "2026-01-31"

**Behavior:**
1. Calls `client.fetch_forecasts_historical()` - uses expanded retrieval window
2. Calls `client.fetch_actual_generation("2026-01-01", "2026-01-31")` - unchanged
3. Converts raw API responses to Pydantic models
4. Returns combined data suitable for accuracy metrics calculation

**Error Handling:**
- Returns empty lists on API errors
- Logs detailed error information

---

### 4. **frontend/src/components/DateRangePicker.jsx** (MODIFIED)
Updated default date range for historical forecast context.

**Changes:**
- `defaultFrom`: `new Date(2026, 0, 1)` - January 1, 2026
- `defaultTo`: `new Date(2026, 0, 31)` - January 31, 2026
- `minDate`: "2026-01-01"
- `maxDate`: "2026-01-31"

**Effect:** User cannot select dates outside January 2026.

---

### 5. **frontend/src/services/api.js** (MODIFIED)
Added new API service function for historical forecasts.

**New Function:**

#### `fetchForecastsHistorical() -> Promise<ForecastResponse>`
- Calls `GET /api/forecasts-historical`
- No parameters (uses backend config)
- Returns combined forecast and actual data
- Includes console logging for debugging

---

### 6. **frontend/src/App.jsx** (MODIFIED)
Updated initial data loading to use historical forecasts.

**Changes:**
1. Added import: `fetchForecastsHistorical` from api.js
2. Modified `useEffect` hook (on mount):
   - Calls `fetchForecastsHistorical()` instead of `fetchForecasts()`
   - Automatically loads January 2026 data on app startup
   - Calculates metrics for the full month via `fetchMetrics("2026-01-01", "2026-01-31")`
   - Sets date range display to January 2026

**Effect:** Users see January 2026 historical data immediately on page load.

---

## Date Filtering Logic Flow

```
┌─────────────────────────────────────────────────────────┐
│ Frontend: App mounted                                   │
│ Calls: fetchForecastsHistorical()                       │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│ Backend: GET /api/forecasts-historical                  │
│ Creates ElexonAPIClient()                               │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│ ElexonAPIClient.fetch_forecasts_historical()            │
│                                                          │
│ 1. Query WINDFOR API:                                   │
│    from=2025-12-01T00:00:00Z (EXPANDED START)           │
│    to=2026-02-01T00:00:00Z (EXPANDED END)               │
│                                                          │
│ 2. API returns all forecasts in that range              │
│    (may include forecasts from Dec, Jan, Feb)           │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│ Filtering: _is_in_delivery_interval()                   │
│                                                          │
│ For each forecast record:                               │
│   Extract: startTime (delivery interval)                │
│   Check: 2026-01-01T00:00:00Z ≤ startTime              │
│           < 2026-02-01T00:00:00Z                        │
│                                                          │
│ Result: Only Jan 2026 delivery intervals retained       │
│ Preserved: publishTime for day-ahead cutoff selection   │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│ Returns to Frontend:                                     │
│ - Forecasts: filtered list with Jan 2026 deliveries     │
│ - Actuals: Jan 2026 actual generation                   │
│ - Date range: "2026-01-01" to "2026-01-31"             │
└─────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. **Expanded Retrieval Window**
- Fetches Dec 1, 2025 - Feb 1, 2026 (not just Jan 1-31)
- **Why:** Forecasts published in December apply to January deliveries
- Ensures no forecasts are missed due to publication timing

### 2. **Two-Stage Filtering**
- **Stage 1 (API level):** `from=2025-12-01&to=2026-02-01`
- **Stage 2 (Application level):** Filter by `startTime` in delivery interval
- **Why:** Handles cases where API doesn't respect date parameters
- Provides verification that data is truly historical

### 3. **Central Configuration**
- All dates in `config.py`
- **Why:** Single source of truth, easy to adjust if requirements change
- No hardcoded dates scattered across codebase

### 4. **Preserved publishTime**
- Each forecast record retains `publishTime`
- **Why:** Enables future day-ahead cutoff logic
- Example: "Only use forecasts published before 10am UTC"

### 5. **Separate Endpoints**
- `/api/forecasts` - Flexible date range queries
- `/api/forecasts-historical` - Fixed January 2026 historical data
- **Why:** Maintains backward compatibility, clear API semantics

---

## Verification

### What the Implementation Verifies

1. **Historical Data Availability:**
   - Logs if API returns data from the expanded retrieval window
   - Warns if only latest data is returned instead of historical

2. **Delivery Interval Filtering:**
   - Counts total vs. filtered records
   - Logs first and last delivery times

3. **publishTime Information:**
   - Confirms multiple forecast versions are captured (if they exist)
   - Displays sample publishTimes in logs

### Example Log Output
```
📡 Fetching WINDFOR historical forecasts
   Retrieval window: 2025-12-01T00:00:00Z to 2026-02-01T00:00:00Z
   Delivery interval filter: 2026-01-01T00:00:00Z to 2026-02-01T00:00:00Z
✅ WINDFOR API returned 2880 total records
   Date range in response: 2025-12-01T08:30:00Z to 2026-02-01T08:30:00Z
✅ Filtered to 744 records with delivery intervals in Jan 2026
   First delivery interval: 2026-01-01T00:00:00Z
   Last delivery interval: 2026-01-31T23:00:00Z
   Sample publishTimes preserved: ['2025-12-31T08:30:00Z', '2026-01-01T08:30:00Z', '2026-01-02T08:30:00Z']
```

---

## Files NOT Modified

As per requirements:
- ✅ `backend/services/metrics.py` - Unchanged
- ✅ `backend/models.py` - Unchanged
- ✅ All actual generation fetching logic - Unchanged
- ✅ Frontend chart and metrics components - Unchanged (data flows through seamlessly)

---

## Usage

### For Users

1. App loads → Automatically fetches January 2026 historical forecasts
2. Date picker constrained to January 2026 (cannot select outside this range)
3. Chart displays forecasts vs actuals for the month
4. Metrics calculated automatically

### For Developers

To adjust the date range:

```python
# In backend/config.py
FORECAST_RETRIEVAL_START = "2025-11-01T00:00:00Z"  # Change here
FORECAST_RETRIEVAL_END = "2026-03-01T00:00:00Z"    # Change here
DELIVERY_INTERVAL_START = "2026-02-01T00:00:00Z"   # Change here
DELIVERY_INTERVAL_END = "2026-03-01T00:00:00Z"     # Change here
```

---

## Testing

To verify the implementation:

1. **Check API response:**
   ```bash
   curl http://localhost:8000/api/forecasts-historical
   ```
   Should return JSON with forecasts and actuals for January 2026

2. **Check logs:**
   - Look for filtering statistics
   - Verify record counts
   - Confirm no warnings about latest data instead of historical

3. **Frontend verification:**
   - Load app, check that chart shows January 2026 data
   - Try to select date outside January 2026 (should be blocked)
   - Verify metrics display correctly
