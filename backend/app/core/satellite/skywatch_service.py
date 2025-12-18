"""
SkyWatch/EarthCache integration for satellite imagery marketplace.
Aggregates 400+ sensors from multiple providers.
Resolution: 50cm - 3m (depending on provider)
Pay-as-you-go, no minimum - https://skywatch.com/
"""
import os
import uuid
import httpx
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from app.config import settings


class SkyWatchService:
    """Service for accessing satellite images via SkyWatch EarthCache platform."""

    BASE_URL = "https://api.skywatch.com/earthcache/v1"

    @classmethod
    def get_api_key(cls) -> str:
        """Get SkyWatch API key from environment."""
        return os.getenv("SKYWATCH_API_KEY") or getattr(
            settings, "SKYWATCH_API_KEY", None
        )

    @classmethod
    def is_available(cls) -> bool:
        """Check if SkyWatch service is available (API key configured)."""
        return bool(cls.get_api_key())

    @classmethod
    def _get_headers(cls) -> dict:
        """Get authentication headers."""
        api_key = cls.get_api_key()
        if not api_key:
            raise ValueError(
                "SkyWatch API key not configured. "
                "Set SKYWATCH_API_KEY in .env"
            )
        return {
            "x-api-key": api_key,
            "Content-Type": "application/json",
        }

    @classmethod
    async def search_archive(
        cls,
        bounds: tuple[float, float, float, float],
        date_start: str,
        date_end: str,
        resolution_min: float = 0.3,
        resolution_max: float = 3.0,
        cloud_cover_max: int = 20,
        limit: int = 10,
    ) -> list[dict]:
        """
        Search SkyWatch archive for available images.
        """
        headers = cls._get_headers()
        min_lon, min_lat, max_lon, max_lat = bounds

        search_params = {
            "start_date": f"{date_start}T00:00:00Z",
            "end_date": f"{date_end}T23:59:59Z",
            "location": {
                "type": "Polygon",
                "coordinates": [[
                    [min_lon, min_lat],
                    [max_lon, min_lat],
                    [max_lon, max_lat],
                    [min_lon, max_lat],
                    [min_lon, min_lat],
                ]]
            },
            "resolution_min": resolution_min,
            "resolution_max": resolution_max,
            "coverage_min": 80,
            "interval_length": 0,
            "order_by": ["cloud_cover_percentage", "resolution"],
        }

        results = []
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{cls.BASE_URL}/archive/search",
                    headers=headers,
                    json=search_params,
                    timeout=30.0,
                )

                if response.status_code == 200:
                    data = response.json()
                    for item in data.get("data", []):
                        cloud_cover = item.get("cloud_cover_percentage", 0)
                        if cloud_cover <= cloud_cover_max:
                            results.append({
                                "id": item.get("id") or item.get("result_id"),
                                "datetime": item.get("start_date") or item.get("date"),
                                "cloud_cover": cloud_cover,
                                "resolution": item.get("resolution"),
                                "satellite": item.get("source") or item.get("satellite"),
                                "coverage": item.get("coverage_percentage", 100),
                                "preview_url": item.get("preview_url") or item.get("thumbnail_url"),
                                "properties": item,
                            })
                elif response.status_code == 401:
                    print("SkyWatch API authentication failed - check API key")
                    return []
                else:
                    print(f"SkyWatch search failed: {response.status_code} - {response.text}")
                    return []

            except Exception as e:
                print(f"Error searching SkyWatch archive: {e}")
                return []

        results.sort(key=lambda x: (x.get("cloud_cover", 100), x.get("resolution", 10)))
        return results[:limit]

    @classmethod
    async def search_closest_image(
        cls,
        bounds: tuple[float, float, float, float],
        target_date: str,
        max_days_range: int = 60,
        cloud_cover_max: int = 30,
        resolution_max: float = 3.0,
    ) -> Optional[dict]:
        """Search for the image closest to a target date."""
        target_dt = datetime.fromisoformat(target_date)
        date_start = (target_dt - timedelta(days=max_days_range)).strftime("%Y-%m-%d")
        date_end = (target_dt + timedelta(days=max_days_range)).strftime("%Y-%m-%d")

        results = await cls.search_archive(
            bounds, date_start, date_end,
            resolution_max=resolution_max,
            cloud_cover_max=cloud_cover_max,
            limit=50,
        )

        if not results:
            print(f"No SkyWatch images found within {max_days_range} days of {target_date}")
            return None

        for result in results:
            dt_str = result.get("datetime", "")
            if dt_str:
                try:
                    if "T" in dt_str:
                        img_date = datetime.fromisoformat(dt_str.replace("Z", "+00:00")).replace(tzinfo=None)
                    else:
                        img_date = datetime.fromisoformat(dt_str[:10])
                    result["days_from_target"] = abs((img_date - target_dt).days)
                except:
                    result["days_from_target"] = 999
            else:
                result["days_from_target"] = 999

        results.sort(key=lambda x: (x["days_from_target"], x.get("cloud_cover", 100)))

        best = results[0]
        print(f"Found SkyWatch image {best['id']} ({best.get('satellite', 'N/A')}) - "
              f"{best['days_from_target']} days from target, "
              f"{best.get('cloud_cover', 0):.1f}% clouds, "
              f"{best.get('resolution', 'N/A')}m resolution")

        return best

    @classmethod
    async def get_preview(cls, image_id: str, preview_url: Optional[str] = None) -> Optional[bytes]:
        """Get preview/thumbnail image."""
        headers = cls._get_headers()

        async with httpx.AsyncClient() as client:
            if preview_url:
                try:
                    response = await client.get(preview_url, timeout=30.0)
                    if response.status_code == 200:
                        return response.content
                except:
                    pass

            try:
                response = await client.get(
                    f"{cls.BASE_URL}/archive/search/{image_id}/preview",
                    headers=headers,
                    timeout=30.0,
                )
                if response.status_code == 200:
                    return response.content
            except Exception as e:
                print(f"Failed to get preview: {e}")

        return None

    @classmethod
    async def download_preview_pair(
        cls,
        bounds: tuple[float, float, float, float],
        date_before: str,
        date_after: str,
        output_dir: Optional[str] = None,
        max_days_range: int = 60,
        resolution_max: float = 3.0,
    ) -> Optional[dict]:
        """Download preview images for before/after comparison."""
        output_dir = output_dir or getattr(settings, "UPLOAD_DIR", "/tmp/hackathon_uploads")
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        min_lon, min_lat, max_lon, max_lat = bounds

        print(f"Searching SkyWatch image closest to 'before' date: {date_before}")
        before_result = await cls.search_closest_image(
            bounds, date_before, max_days_range, resolution_max=resolution_max
        )

        before_image = None
        if before_result:
            preview_data = await cls.get_preview(
                before_result["id"],
                before_result.get("preview_url")
            )

            if preview_data:
                before_path = Path(output_dir) / f"skywatch_before_{uuid.uuid4()}.jpg"
                before_path.write_bytes(preview_data)

                before_image = {
                    "id": str(uuid.uuid4()),
                    "filepath": str(before_path),
                    "date": before_result.get("datetime", date_before)[:10],
                    "days_from_target": before_result.get("days_from_target", 0),
                    "bounds": {"min_lon": min_lon, "min_lat": min_lat, "max_lon": max_lon, "max_lat": max_lat},
                    "resolution": before_result.get("resolution", 1.0),
                    "satellite": before_result.get("satellite"),
                    "cloud_cover": before_result.get("cloud_cover", 0),
                    "source": "SkyWatch",
                    "skywatch_id": before_result["id"],
                }

        print(f"Searching SkyWatch image closest to 'after' date: {date_after}")
        after_result = await cls.search_closest_image(
            bounds, date_after, max_days_range, resolution_max=resolution_max
        )

        after_image = None
        if after_result:
            preview_data = await cls.get_preview(
                after_result["id"],
                after_result.get("preview_url")
            )

            if preview_data:
                after_path = Path(output_dir) / f"skywatch_after_{uuid.uuid4()}.jpg"
                after_path.write_bytes(preview_data)

                after_image = {
                    "id": str(uuid.uuid4()),
                    "filepath": str(after_path),
                    "date": after_result.get("datetime", date_after)[:10],
                    "days_from_target": after_result.get("days_from_target", 0),
                    "bounds": {"min_lon": min_lon, "min_lat": min_lat, "max_lon": max_lon, "max_lat": max_lat},
                    "resolution": after_result.get("resolution", 1.0),
                    "satellite": after_result.get("satellite"),
                    "cloud_cover": after_result.get("cloud_cover", 0),
                    "source": "SkyWatch",
                    "skywatch_id": after_result["id"],
                }

        if before_image and after_image:
            return {"before": before_image, "after": after_image}
        elif before_image:
            return {"before": before_image, "after": None}
        elif after_image:
            return {"before": None, "after": after_image}
        else:
            return None
