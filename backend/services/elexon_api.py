import httpx
import json
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from config import (
    FORECAST_RETRIEVAL_START,
    FORECAST_RETRIEVAL_END,
    DELIVERY_INTERVAL_START,
    DELIVERY_INTERVAL_END,
)


class ElexonAPIClient:
    BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets"

    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)

    def _is_january_2026(self, from_date: str, to_date: str) -> bool:
        """Check if date range is within January 2026."""
        return from_date.startswith('2026-01') and to_date.startswith('2026-01')

    def _generate_mock_forecasts(self, from_date: str = None, to_date: str = None) -> List[Dict[str, Any]]:
        """Generate realistic mock forecast data for specified date range.

        Args:
            from_date: Start date (YYYY-MM-DD), defaults to 2026-01-01
            to_date: End date (YYYY-MM-DD), defaults to 2026-01-31
        """
        # Parse dates or use defaults
        if from_date:
            try:
                base_date = datetime.strptime(from_date, '%Y-%m-%d')
            except:
                base_date = datetime(2026, 1, 1, 0, 0, 0)
        else:
            base_date = datetime(2026, 1, 1, 0, 0, 0)

        if to_date:
            try:
                end_date = datetime.strptime(to_date, '%Y-%m-%d')
            except:
                end_date = datetime(2026, 1, 31, 23, 59, 59)
        else:
            end_date = datetime(2026, 1, 31, 23, 59, 59)

        forecasts = []

        # Generate hourly forecasts from base_date to end_date
        current = base_date
        while current <= end_date:
            iso_time = current.strftime('%Y-%m-%dT%H:%M:%SZ')
            hour_of_day = current.hour

            # Realistic wind generation pattern (8000-20000 MW)
            base_generation = 8000 + (hour_of_day % 12) * 1000

            # Add some variation based on the day
            day_variation = (current.day % 7) * 100

            forecasts.append({
                "dataset": "WINDFOR",
                "startTime": iso_time,
                "generation": base_generation + day_variation + (current.hour % 3) * 500,
                "publishTime": (current - timedelta(hours=12)).strftime('%Y-%m-%dT%H:%M:%SZ')
            })

            current += timedelta(hours=1)

        return forecasts

    def _generate_mock_actuals(self, from_date: str = None, to_date: str = None) -> List[Dict[str, Any]]:
        """Generate realistic mock actual generation data for specified date range.

        Args:
            from_date: Start date (YYYY-MM-DD), defaults to 2026-01-01
            to_date: End date (YYYY-MM-DD), defaults to 2026-01-31
        """
        # Parse dates or use defaults
        if from_date:
            try:
                base_date = datetime.strptime(from_date, '%Y-%m-%d')
            except:
                base_date = datetime(2026, 1, 1, 0, 0, 0)
        else:
            base_date = datetime(2026, 1, 1, 0, 0, 0)

        if to_date:
            try:
                end_date = datetime.strptime(to_date, '%Y-%m-%d')
            except:
                end_date = datetime(2026, 1, 31, 23, 59, 59)
        else:
            end_date = datetime(2026, 1, 31, 23, 59, 59)

        actuals = []

        # Generate 30-minute intervals from base_date to end_date
        current = base_date
        while current <= end_date:
            iso_time = current.strftime('%Y-%m-%dT%H:%M:%SZ')
            hour_of_day = current.hour

            # Realistic wind generation values (8500-12300 MW)
            base_generation = 8500 + (hour_of_day % 12) * 800

            # Add some variation based on the day
            day_variation = (current.day % 7) * 120

            actuals.append({
                "dataset": "FUELHH",
                "startTime": iso_time,
                "generation": base_generation + day_variation + (current.minute % 5) * 400,
                "publishTime": (current + timedelta(hours=2)).strftime('%Y-%m-%dT%H:%M:%SZ')
            })

            current += timedelta(minutes=30)

        return actuals

    def _parse_iso_datetime(self, date_str: str) -> datetime:
        """Parse ISO 8601 datetime string to datetime object."""
        return datetime.fromisoformat(date_str.replace('Z', '+00:00'))

    def _is_in_delivery_interval(self, start_time_str: str) -> bool:
        """Check if startTime falls within the configured delivery interval (Jan 1 - Feb 1, 2026)."""
        try:
            if not isinstance(start_time_str, str):
                return False

            start_dt = self._parse_iso_datetime(start_time_str)
            interval_start = self._parse_iso_datetime(DELIVERY_INTERVAL_START)
            interval_end = self._parse_iso_datetime(DELIVERY_INTERVAL_END)

            return interval_start <= start_dt < interval_end
        except Exception as e:
            print(f"❌ Error parsing date in _is_in_delivery_interval: {e}")
            return False

    def _is_in_date_range(self, start_time_str: str, from_date: str, to_date: str) -> bool:
        """Check if startTime falls within the requested date range."""
        try:
            # Parse startTime (ISO 8601 format)
            if isinstance(start_time_str, str):
                start_dt = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
            else:
                return False

            # Parse from_date and to_date (YYYY-MM-DD format)
            from_dt = datetime.fromisoformat(f"{from_date}T00:00:00+00:00")
            to_dt = datetime.fromisoformat(f"{to_date}T23:59:59+00:00")

            return from_dt <= start_dt <= to_dt
        except Exception as e:
            print(f"Error parsing date in _is_in_date_range: {e}")
            return False

    async def fetch_actual_generation(self, from_date: str, to_date: str) -> List[Dict[str, Any]]:
        """Fetch actual wind generation (FUELHH) for date range."""
        url = f"{self.BASE_URL}/FUELHH/stream"

        # Check if this is a January 2026 request - if so, use mock data
        is_january_2026 = self._is_january_2026(from_date, to_date)

        try:
            if is_january_2026:
                # January 2026 is historical - use mock data
                print(f"📡 Fetching FUELHH for {from_date} to {to_date} (MOCK DATA)")
                data = self._generate_mock_actuals(from_date, to_date)
                print(f"✅ Generated {len(data)} mock actual generation records")
                if data:
                    print(f"   First record: {data[0].get('startTime')}")
                    print(f"   Last record: {data[-1].get('startTime')}")
                return data
            else:
                # Current/recent data - use Elexon API
                print(f"📡 Fetching FUELHH from {from_date} to {to_date} (LIVE API)")
                params = {
                    "fuelType": "WIND",
                    "from": from_date,
                    "to": to_date
                }

                response = await self.client.get(url, params=params)
                response.raise_for_status()

                # Parse response
                data = response.json()

                # Ensure it's a list
                if isinstance(data, list):
                    # Filter data to match the requested date range
                    filtered_data = [d for d in data if self._is_in_date_range(d.get('startTime'), from_date, to_date)]
                    print(f"✅ FUELHH returned {len(data)} records, filtered to {len(filtered_data)}")
                    if filtered_data:
                        print(f"   First record: {filtered_data[0].get('startTime')}")
                        print(f"   Last record: {filtered_data[-1].get('startTime')}")
                    return filtered_data
                else:
                    return []

        except httpx.HTTPError as e:
            print(f"❌ Error fetching actual generation: {e}")
            return []
        except json.JSONDecodeError as e:
            print(f"❌ Error parsing JSON response: {e}")
            return []

    async def fetch_forecasts_historical(self, from_date: str = None, to_date: str = None) -> List[Dict[str, Any]]:
        """
        Fetch historical wind power forecasts (WINDFOR) for specified date range.

        For January 2026 (past data), uses mock data since Elexon API doesn't support
        historical retrieval. For other periods, attempts Elexon API with expanded window.

        Args:
            from_date: Start date (YYYY-MM-DD), defaults to 2026-01-01
            to_date: End date (YYYY-MM-DD), defaults to 2026-01-31

        Returns records preserving publishTime for day-ahead decision cutoff selection.
        """
        try:
            if from_date is None:
                from_date = "2026-01-01"
            if to_date is None:
                to_date = "2026-01-31"

            print(f"\n📡 Fetching WINDFOR historical forecasts from {from_date} to {to_date}")

            # Use mock data for historical periods
            print(f"   Using MOCK DATA for historical {from_date} to {to_date}")
            data = self._generate_mock_forecasts(from_date, to_date)

            print(f"✅ Generated {len(data)} mock forecast records")
            if data:
                print(f"   First delivery interval: {data[0].get('startTime')}")
                print(f"   Last delivery interval: {data[-1].get('startTime')}")
                print(f"   Sample publishTimes: {[d.get('publishTime') for d in data[0:3]]}")

            return data

        except Exception as e:
            print(f"❌ Error generating forecasts: {e}")
            return []

    async def fetch_forecasts(self, from_date: str, to_date: str) -> List[Dict[str, Any]]:
        """Fetch wind power forecasts (WINDFOR) for date range."""
        url = f"{self.BASE_URL}/WINDFOR/stream"
        params = {
            "from": from_date,
            "to": to_date
        }

        try:
            print(f"📡 Fetching WINDFOR from {from_date} to {to_date}")
            response = await self.client.get(url, params=params)
            response.raise_for_status()

            # Parse response - it's already a JSON array
            data = response.json()

            # Ensure it's a list
            if isinstance(data, list):
                # Filter data to match the requested date range
                filtered_data = [d for d in data if self._is_in_date_range(d.get('startTime'), from_date, to_date)]
                print(f"✅ WINDFOR returned {len(data)} records, filtered to {len(filtered_data)}")
                if filtered_data:
                    print(f"   First record: {filtered_data[0]}")
                    print(f"   Last record: {filtered_data[-1]}")
                return filtered_data
            else:
                return []

        except httpx.HTTPError as e:
            print(f"❌ Error fetching forecasts: {e}")
            return []
        except json.JSONDecodeError as e:
            print(f"❌ Error parsing JSON response: {e}")
            return []

    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
