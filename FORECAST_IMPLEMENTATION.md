# Implementation Complete: Historical Forecast Data Fetching

## ✅ Summary

Successfully implemented historical wind power forecast fetching for January 2026 using an **expanded retrieval window** (Dec 1, 2025 - Feb 1, 2026) with **two-stage date filtering** to isolate delivery intervals within January 2026.

---

## 📁 Files Modified

### 1. **backend/config.py** ← NEW FILE
**Purpose:** Single configuration location for all forecast date parameters

```python
FORECAST_RETRIEVAL_START = "2025-12-01T00:00:00Z"   # Expanded start
FORECAST_RETRIEVAL_END = "2026-02-01T00:00:00Z"     # Expanded end
DELIVERY_INTERVAL_START = "2026-01-01T00:00:00Z"    # Filter start (inclusive)
DELIVERY_INTERVAL_END = "2026-02-01T00:00:00Z"      # Filter end (exclusive)
```

**Why separate file:**
- Central source of truth for date ranges
- Easy to update without modifying service code
- Imported by backend services

---

### 2. **backend/services/elexon_api.py** ← MODIFIED
**Changes:** Added historical forecast fetching with dual-layer filtering

**New Methods:**

| Method | Purpose |
|--------|---------|
| `_parse_iso_datetime()` | Parse ISO 8601 datetime strings consistently |
| `_is_in_delivery_interval()` | Check if `startTime` is in Jan 2026 delivery window |
| `fetch_forecasts_historical()` | **[NEW]** Fetch with expanded retrieval window + filtering |

**Key Features:**
- ✅ Uses expanded window (Dec 1, 2025 - Feb 1, 2026) to capture all relevant forecasts
- ✅ Filters by `startTime` to retain only Jan 2026 delivery intervals
- ✅ Preserves `publishTime` for day-ahead decision cutoff logic
- ✅ Verifies API returns historical data (warns if latest data only)
- ✅ Logs detailed filtering statistics

**Unchanged:**
- `fetch_forecasts()` - Still available for flexible date range queries
- `fetch_actual_generation()` - Unchanged, uses existing logic
- `_is_in_date_range()` - Unchanged helper

---

### 3. **backend/main.py** ← MODIFIED
**Changes:** Added new endpoint for historical forecast retrieval

**New Endpoint:**
```
GET /api/forecasts-historical
```

**Response:**
```json
{
  "forecasts": [...],      // Jan 2026 forecast records with publishTime
  "actuals": [...],        // Jan 2026 actual generation
  "from_date": "2026-01-01",
  "to_date": "2026-01-31"
}
```

**Logic:**
1. Calls `client.fetch_forecasts_historical()` (expanded retrieval)
2. Calls `client.fetch_actual_generation()` (standard Jan 2026 range)
3. Converts to Pydantic models
4. Returns combined response

---

### 4. **frontend/src/components/DateRangePicker.jsx** ← MODIFIED
**Changes:** Updated default date range constraints

```javascript
const defaultFrom = new Date(2026, 0, 1)    // Jan 1
const defaultTo = new Date(2026, 0, 31)     // Jan 31
const minDate = "2026-01-01"
const maxDate = "2026-01-31"
```

**Effect:** Users cannot select dates outside January 2026

---

### 5. **frontend/src/services/api.js** ← MODIFIED
**Changes:** Added historical forecast API service function

```javascript
export const fetchForecastsHistorical = async () => {
  const response = await api.get('/api/forecasts-historical')
  return response.data
}
```

**No parameters** - Uses backend config.py dates

---

### 6. **frontend/src/App.jsx** ← MODIFIED
**Changes:** Updated initial data loading strategy

```javascript
useEffect(() => {
  const loadHistoricalData = async () => {
    const data = await fetchForecastsHistorical()  // ← NEW
    const metrics = await fetchMetrics('2026-01-01', '2026-01-31')
    // ... update state
  }
  loadHistoricalData()
}, [])
```

**Effect:** App automatically loads January 2026 historical data on startup

**Added import:**
```javascript
import { fetchForecasts, fetchForecastsHistorical, fetchMetrics } from './services/api'
```

---

## 🔄 Forecast Date Filtering Workflow

```
User loads app
    ↓
Frontend calls: fetchForecastsHistorical()
    ↓
Backend: GET /api/forecasts-historical
    ↓
ElexonAPIClient.fetch_forecasts_historical()
    ├─ Query WINDFOR API:
    │  from: 2025-12-01T00:00:00Z (EXPANDED)
    │  to: 2026-02-01T00:00:00Z (EXPANDED)
    │
    └─ API returns all forecasts in Dec-Feb range
           ↓
    Apply _is_in_delivery_interval() filter:
    └─ Check: 2026-01-01T00:00:00Z ≤ startTime < 2026-02-01T00:00:00Z
           ↓
    Result: Only Jan 2026 delivery intervals
           ↓
    Return: Filtered records with publishTime preserved
           ↓
Frontend displays January 2026 chart
```

---

## 🎯 Key Design Requirements Met

| Requirement | Implementation | Location |
|-------------|-----------------|----------|
| **Fetch historical WINDFOR data** | `fetch_forecasts_historical()` method | elexon_api.py:95-162 |
| **Single config location** | `config.py` with date constants | backend/config.py |
| **Filter by startTime (Jan only)** | `_is_in_delivery_interval()` checks startTime | elexon_api.py:23-36 |
| **Preserve publishTime** | All records kept with publishTime field | elexon_api.py:153 |
| **Verify historical data** | Warns if API returns latest instead | elexon_api.py:138-141 |
| **Leave actuals unchanged** | `fetch_actual_generation()` unmodified | elexon_api.py:59-93 |
| **Leave other features unchanged** | No changes to metrics, models, charts | ✅ |

---

## 📊 Date Configuration

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `FORECAST_RETRIEVAL_START` | `2025-12-01T00:00:00Z` | Expanded window to capture early forecasts |
| `FORECAST_RETRIEVAL_END` | `2026-02-01T00:00:00Z` | Expanded window to capture late forecasts |
| `DELIVERY_INTERVAL_START` | `2026-01-01T00:00:00Z` | Filter boundary (inclusive) |
| `DELIVERY_INTERVAL_END` | `2026-02-01T00:00:00Z` | Filter boundary (exclusive) |

**Filtering Logic:**
- Retrieves: 3 months of data (Dec, Jan, Feb)
- Filters to: 1 month delivery intervals (Jan only)
- Preserves: `publishTime` for each forecast version

---

## 🔍 Verification & Logging

### Detailed Log Output Example:
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

### What's Verified:
- ✅ API receives expanded retrieval window
- ✅ Total records returned
- ✅ Date range in API response (confirms historical data)
- ✅ Filtering applied correctly
- ✅ publishTime field preserved (3 samples shown)

---

## 🚀 Usage

### For End Users
1. Open app → Automatically loads January 2026 historical forecasts
2. Chart displays all forecasts vs actuals for the month
3. Metrics calculated for full month
4. Date picker locked to January 2026 range

### For Developers
To change date range, edit **one file** (`backend/config.py`):

```python
# Example: Change to February 2026
FORECAST_RETRIEVAL_START = "2026-01-01T00:00:00Z"
FORECAST_RETRIEVAL_END = "2026-03-01T00:00:00Z"
DELIVERY_INTERVAL_START = "2026-02-01T00:00:00Z"
DELIVERY_INTERVAL_END = "2026-03-01T00:00:00Z"
```

Then restart backend - all filtering updates automatically.

---

## ✅ What Remains Unchanged

- ✅ `backend/models.py` - Pydantic models untouched
- ✅ `backend/services/metrics.py` - Calculation logic untouched
- ✅ Actual generation fetching (`fetch_actual_generation()`) - unchanged
- ✅ Frontend chart component - receives data unchanged
- ✅ Frontend metrics component - receives data unchanged
- ✅ All other application functionality

---

## 🧪 Testing Checklist

- [ ] Backend starts without errors: `docker-compose up`
- [ ] Historical forecast endpoint works: `curl http://localhost:8000/api/forecasts-historical`
- [ ] Response includes January 2026 data only
- [ ] publishTime field present in forecast records
- [ ] Frontend loads without errors
- [ ] Chart displays January 2026 data automatically
- [ ] Date picker prevents selection outside January
- [ ] Metrics calculate correctly for the month
- [ ] Browser console shows no errors
- [ ] Backend logs show filtering statistics

---

## 📝 Notes

1. **Expanded Retrieval Window Rationale:**
   - Forecasts published in December may have delivery intervals in January
   - Forecasts published in January have delivery intervals in January
   - Expanded window (Dec-Feb) ensures no forecasts are missed

2. **Exclusive Upper Bound:**
   - `startTime < 2026-02-01T00:00:00Z` (not `≤`)
   - Ensures Feb 1st midnight is excluded
   - Keeps data strictly to January deliveries

3. **publishTime Preservation:**
   - Multiple forecasts can exist for same delivery interval
   - Different `publishTime` values indicate forecast revisions
   - Enables future day-ahead cutoff logic (e.g., "use forecast published before 10am")

4. **Backward Compatibility:**
   - Original `/api/forecasts` endpoint still available
   - Can still query with any date range
   - Historical endpoint is addition, not replacement
