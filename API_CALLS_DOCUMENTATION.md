# API Calls Documentation - Complete Flow

## Overview
यह document explain करता है कि **दोनों APIs कहाँ से data fetch करती हैं** और उनके addresses क्या हैं।

---

## 🎯 API #1: Historical Forecast API

### Backend Endpoint (हमारा बनाया हुआ)
```
Method: GET
Endpoint: /api/forecasts-historical
Full URL: http://localhost:8000/api/forecasts-historical
```

**Location in code:**
- `File`: backend/main.py
- `Line`: 29-82
- `Function`: `get_forecasts_historical()`

**Code:**
```python
@app.get("/api/forecasts-historical")
async def get_forecasts_historical(response_model=ForecastResponse):
    client = ElexonAPIClient()
    forecasts_data = await client.fetch_forecasts_historical()  # ← Line 44
```

---

### External Elexon API (जहाँ से actual data आता है)
```
Method: GET
Base URL: https://data.elexon.co.uk/bmrs/api/v1/datasets
Dataset: WINDFOR
Full URL: https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream

Query Parameters:
  from: 2025-12-01T00:00:00Z
  to: 2026-02-01T00:00:00Z
```

**Location in code:**
- `File`: backend/services/elexon_api.py
- `Line`: 105-162
- `Function`: `fetch_forecasts_historical()`
- `Method Call`: `response = await self.client.get(url, params=params)` (Line 116)

**Code:**
```python
async def fetch_forecasts_historical(self) -> List[Dict[str, Any]]:
    url = f"{self.BASE_URL}/WINDFOR/stream"  # ← Elexon API URL
    params = {
        "from": FORECAST_RETRIEVAL_START,    # 2025-12-01T00:00:00Z
        "to": FORECAST_RETRIEVAL_END         # 2026-02-01T00:00:00Z
    }
    response = await self.client.get(url, params=params)  # ← Line 116: API CALL
```

---

## 🎯 API #2: Actual Generation API

### Backend Endpoint (हमारा existing)
```
Method: GET
Endpoint: /api/forecasts (generic, used for actuals too)
Full URL: http://localhost:8000/api/forecasts?from_date=2026-01-01&to_date=2026-01-31
```

**Location in code:**
- `File`: backend/main.py
- `Line`: 64-119
- `Function`: `get_forecasts()`

**Code:**
```python
@app.get("/api/forecasts")
async def get_forecasts(
    from_date: str = Query(...),
    to_date: str = Query(...)
):
    actuals_data = await client.fetch_actual_generation(from_date, to_date)  # ← Line 75
```

---

### External Elexon API (जहाँ से actual data आता है)
```
Method: GET
Base URL: https://data.elexon.co.uk/bmrs/api/v1/datasets
Dataset: FUELHH (actual generation)
Full URL: https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream

Query Parameters:
  fuelType: WIND
  from: 2026-01-01
  to: 2026-01-31
```

**Location in code:**
- `File`: backend/services/elexon_api.py
- `Line`: 59-93
- `Function`: `fetch_actual_generation()`
- `Method Call`: `response = await self.client.get(url, params=params)` (Line 70)

**Code:**
```python
async def fetch_actual_generation(self, from_date: str, to_date: str) -> List[Dict[str, Any]]:
    url = f"{self.BASE_URL}/FUELHH/stream"  # ← Elexon API URL
    params = {
        "fuelType": "WIND",
        "from": from_date,
        "to": to_date
    }
    response = await self.client.get(url, params=params)  # ← Line 70: API CALL
```

---

## 📊 Comparison Table

| Aspect | Forecast API | Actual Generation API |
|--------|--------------|----------------------|
| **हमारी Backend** | `/api/forecasts-historical` | `/api/forecasts` |
| **Elexon Dataset** | `WINDFOR` (forecast) | `FUELHH` (actual) |
| **Elexon Endpoint** | `/WINDFOR/stream` | `/FUELHH/stream` |
| **Retrieval Window** | 2025-12-01 to 2026-02-01 | Variable (2026-01-01 to 2026-01-31) |
| **Elexon Function** | `fetch_forecasts_historical()` | `fetch_actual_generation()` |
| **Code Location** | elexon_api.py:95-162 | elexon_api.py:59-93 |
| **API Call Line** | Line 116 | Line 70 |
| **Data Filtering** | By `startTime` (delivery interval) | By `startTime` (delivery interval) |

---

## 🔄 Complete Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ FORECAST DATA FLOW                                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Frontend: fetchForecastsHistorical()                            │
│     ↓                                                            │
│ GET http://localhost:8000/api/forecasts-historical              │
│     ↓                                                            │
│ Backend: main.py:44                                             │
│ client.fetch_forecasts_historical()                             │
│     ↓                                                            │
│ elexon_api.py:116 ← API CALL HERE                              │
│ GET https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/... │
│ Params: from=2025-12-01T00:00:00Z&to=2026-02-01T00:00:00Z     │
│     ↓                                                            │
│ Elexon Returns: 2880+ forecast records                          │
│     ↓                                                            │
│ Backend Filters: Keep only Jan 2026 delivery intervals          │
│     ↓                                                            │
│ Return ~744 records to Frontend                                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ ACTUAL GENERATION DATA FLOW                                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Frontend: fetchForecasts('2026-01-01', '2026-01-31')           │
│     ↓                                                            │
│ GET http://localhost:8000/api/forecasts?...                     │
│     ↓                                                            │
│ Backend: main.py:75                                             │
│ client.fetch_actual_generation(from_date, to_date)             │
│     ↓                                                            │
│ elexon_api.py:70 ← API CALL HERE                               │
│ GET https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/...  │
│ Params: fuelType=WIND&from=2026-01-01&to=2026-01-31           │
│     ↓                                                            │
│ Elexon Returns: Actual generation records                       │
│     ↓                                                            │
│ Backend Filters: Keep only Jan 2026 delivery intervals          │
│     ↓                                                            │
│ Return filtered records to Frontend                             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔗 Direct Elexon API Calls (for Testing)

### Test Forecast API Directly
```bash
curl "https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream?from=2025-12-01T00:00:00Z&to=2026-02-01T00:00:00Z"
```

### Test Actual Generation API Directly
```bash
curl "https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream?fuelType=WIND&from=2026-01-01&to=2026-01-31"
```

### Test via Our Backend
```bash
# Forecasts
curl "http://localhost:8000/api/forecasts-historical"

# Actuals
curl "http://localhost:8000/api/forecasts?from_date=2026-01-01&to_date=2026-01-31"
```

---

## 📍 Key Locations in Code

### elexon_api.py (Line Numbers)

| What | Line |
|------|------|
| Forecast API Base URL definition | 14 |
| fetch_forecasts_historical() start | 95 |
| Elexon WINDFOR URL construction | 105 |
| **FORECAST API CALL** | **116** ⭐ |
| Filtering by delivery interval | 144-147 |
| fetch_actual_generation() start | 59 |
| Elexon FUELHH URL construction | 61 |
| **ACTUALS API CALL** | **70** ⭐ |
| Filtering by date range | 79 |

### main.py (Line Numbers)

| What | Line |
|------|------|
| Historical forecasts endpoint definition | 29 |
| **Call to fetch_forecasts_historical()** | **44** ⭐ |
| Forecasts endpoint definition | 64 |
| **Call to fetch_actual_generation()** | **75** ⭐ |

---

## 📋 Configuration Reference

### config.py (Date Parameters)

```python
# Where forecast retrieval window is configured
FORECAST_RETRIEVAL_START = "2025-12-01T00:00:00Z"
FORECAST_RETRIEVAL_END = "2026-02-01T00:00:00Z"

# Where delivery interval filter is configured
DELIVERY_INTERVAL_START = "2026-01-01T00:00:00Z"
DELIVERY_INTERVAL_END = "2026-02-01T00:00:00Z"
```

---

## ✅ Summary

### दोनों APIs का काम:

1. **Forecast API (WINDFOR)**
   - Backend calls: Line 116 of elexon_api.py
   - Elexon URL: `https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream`
   - Fetches: Wind power forecasts for Dec 1, 2025 - Feb 1, 2026
   - Filters: Only keeps January 2026 deliveries

2. **Actual Generation API (FUELHH)**
   - Backend calls: Line 70 of elexon_api.py
   - Elexon URL: `https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream`
   - Fetches: Actual wind generation for requested date range
   - Filters: Only keeps January 2026 deliveries

### Data Flow:
```
Frontend → Our Backend → Elexon API → Filter → Frontend Display
```

**दोनों APIs में:**
- ✅ Request: Elexon APIs को भेजी जाती है
- ✅ Response: Data मिलता है
- ✅ Filter: Backend में data को filter किया जाता है
- ✅ Return: Filtered data frontend को दिया जाता है
