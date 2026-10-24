import httpx
import json
from datetime import datetime
from typing import List, Dict, Any


class ElexonAPIClient:
    BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets"

    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)

    async def fetch_actual_generation(self, from_date: str, to_date: str) -> List[Dict[str, Any]]:
        """Fetch actual wind generation (FUELHH) for date range."""
        url = f"{self.BASE_URL}/FUELHH/stream"
        params = {
            "fuelType": "WIND",
            "from": from_date,
            "to": to_date
        }

        try:
            response = await self.client.get(url, params=params)
            response.raise_for_status()

            # Parse response - it's already a JSON array
            data = response.json()

            # Ensure it's a list
            if isinstance(data, list):
                return data
            else:
                return []

        except httpx.HTTPError as e:
            print(f"Error fetching actual generation: {e}")
            return []
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON response: {e}")
            return []

    async def fetch_forecasts(self, from_date: str, to_date: str) -> List[Dict[str, Any]]:
        """Fetch wind power forecasts (WINDFOR) for date range."""
        url = f"{self.BASE_URL}/WINDFOR/stream"
        params = {
            "from": from_date,
            "to": to_date
        }

        try:
            response = await self.client.get(url, params=params)
            response.raise_for_status()

            # Parse response - it's already a JSON array
            data = response.json()

            # Ensure it's a list
            if isinstance(data, list):
                return data
            else:
                return []

        except httpx.HTTPError as e:
            print(f"Error fetching forecasts: {e}")
            return []
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON response: {e}")
            return []

    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()

