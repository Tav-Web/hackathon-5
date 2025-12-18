"""
Planet NICFI (Norway's International Climate & Forests Initiative) integration.
Provides FREE access to high-resolution tropical forest imagery.
Resolution: 4.77m/pixel (monthly mosaics)
Coverage: Tropical forests only (Amazon, Congo Basin, Southeast Asia, etc.)
https://www.planet.com/nicfi/
"""
import os
import uuid
import httpx
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from app.config import settings


# Tropical forest regions covered by NICFI
# Format: (min_lon, min_lat, max_lon, max_lat)
NICFI_TROPICAL_REGIONS = {
    "amazon": {
        "name": "Amazonia",
        "bounds": (-82, -20, -34, 13),
        "countries": ["Brasil", "Peru", "Colombia", "Ecuador", "Venezuela", "Bolivia", "Guiana", "Suriname", "Guiana Francesa"],
    },
    "congo": {
        "name": "Bacia do Congo",
        "bounds": (8, -14, 32, 10),
        "countries": ["RDC", "Congo", "Camaroes", "Gabao", "Guine Equatorial", "Republica Centro-Africana"],
    },
    "southeast_asia": {
        "name": "Sudeste Asiatico",
        "bounds": (92, -11, 141, 28),
        "countries": ["Indonesia", "Malasia", "Papua Nova Guine", "Myanmar", "Tailandia", "Vietna", "Laos", "Camboja", "Filipinas"],
    },
    "central_america": {
        "name": "America Central",
        "bounds": (-92, 7, -77, 18),
        "countries": ["Guatemala", "Honduras", "Nicaragua", "Costa Rica", "Panama", "Belize"],
    },
    "west_africa": {
        "name": "Africa Ocidental",
        "bounds": (-18, 4, 16, 15),
        "countries": ["Costa do Marfim", "Gana", "Liberia", "Serra Leoa", "Guine", "Nigeria"],
    },
    "atlantic_forest": {
        "name": "Mata Atlantica",
        "bounds": (-55, -30, -34, -3),
        "countries": ["Brasil"],
    },
}


class NICFIService:
    """Service for accessing tropical forest images via Planet NICFI program."""

    _client = None
    BASE_URL = "https://api.planet.com"

    @classmethod
    def get_api_key(cls) -> str:
        """Get Planet API key from environment."""
        return os.getenv("PLANET_API_KEY") or getattr(
            settings, "PLANET_API_KEY", None
        )

    @classmethod
    def is_available(cls) -> bool:
        """Check if NICFI service is available (API key configured)."""
        return bool(cls.get_api_key())

    @classmethod
    def check_tropical_coverage(
        cls, bounds: tuple[float, float, float, float]
    ) -> tuple[bool, Optional[str], list[str]]:
        """
        Check if the given bounds are within NICFI tropical coverage.

        Args:
            bounds: (min_lon, min_lat, max_lon, max_lat)

        Returns:
            Tuple of (is_covered, region_name, covered_countries)
        """
        min_lon, min_lat, max_lon, max_lat = bounds

        for region_id, region in NICFI_TROPICAL_REGIONS.items():
            r_min_lon, r_min_lat, r_max_lon, r_max_lat = region["bounds"]

            # Check if bounds overlap with region
            if (min_lon <= r_max_lon and max_lon >= r_min_lon and
                min_lat <= r_max_lat and max_lat >= r_min_lat):
                return True, region["name"], region["countries"]

        return False, None, []

    @classmethod
    def get_coverage_info(cls) -> dict:
        """Get information about NICFI coverage areas."""
        return {
            "regions": [
                {
                    "id": region_id,
                    "name": region["name"],
                    "bounds": {
                        "min_lon": region["bounds"][0],
                        "min_lat": region["bounds"][1],
                        "max_lon": region["bounds"][2],
                        "max_lat": region["bounds"][3],
                    },
                    "countries": region["countries"],
                }
                for region_id, region in NICFI_TROPICAL_REGIONS.items()
            ],
            "total_countries": len(set(
                country
                for region in NICFI_TROPICAL_REGIONS.values()
                for country in region["countries"]
            )),
        }

    @classmethod
    async def search_mosaics(
        cls,
        bounds: tuple[float, float, float, float],
        date_start: str,
        date_end: str,
    ) -> list[dict]:
        """
        Search for available NICFI mosaics.

        Args:
            bounds: (min_lon, min_lat, max_lon, max_lat)
            date_start: Start date (YYYY-MM-DD)
            date_end: End date (YYYY-MM-DD)

        Returns:
            List of available mosaics
        """
        api_key = cls.get_api_key()
        if not api_key:
            raise ValueError("PLANET_API_KEY not configured")

        # Check tropical coverage first
        is_covered, region_name, _ = cls.check_tropical_coverage(bounds)
        if not is_covered:
            print(f"Area is not within NICFI tropical coverage")
            return []

        print(f"Area is within NICFI region: {region_name}")

        # NICFI mosaics are available as basemaps
        # They have naming pattern: planet_medres_normalized_analytic_YYYY-MM_mosaic
        results = []

        async with httpx.AsyncClient() as client:
            try:
                # List available NICFI basemaps/mosaics
                response = await client.get(
                    f"{cls.BASE_URL}/basemaps/v1/mosaics",
                    params={
                        "name__contains": "planet_medres_normalized_analytic",
                    },
                    auth=(api_key, ""),
                    timeout=30.0,
                )

                if response.status_code == 200:
                    data = response.json()
                    mosaics = data.get("mosaics", [])

                    # Parse date range
                    start_dt = datetime.fromisoformat(date_start)
                    end_dt = datetime.fromisoformat(date_end)

                    for mosaic in mosaics:
                        # Extract date from mosaic name (e.g., "2023-06")
                        name = mosaic.get("name", "")
                        mosaic_id = mosaic.get("id")

                        # Try to parse date from name
                        try:
                            # NICFI mosaics have dates like "2023-06" in their names
                            import re
                            date_match = re.search(r"(\d{4}-\d{2})", name)
                            if date_match:
                                mosaic_date_str = date_match.group(1) + "-01"
                                mosaic_date = datetime.fromisoformat(mosaic_date_str)

                                # Check if within date range
                                if start_dt <= mosaic_date <= end_dt:
                                    results.append({
                                        "id": mosaic_id,
                                        "name": name,
                                        "datetime": mosaic_date_str,
                                        "type": "monthly_mosaic",
                                        "resolution": 4.77,
                                        "source": "NICFI",
                                    })
                        except Exception as e:
                            print(f"Could not parse date from mosaic name {name}: {e}")
                            continue

                elif response.status_code == 401:
                    print("NICFI API authentication failed - check API key and NICFI access")
                    return []
                else:
                    print(f"NICFI mosaics search failed: {response.status_code}")
                    return []

            except Exception as e:
                print(f"Error searching NICFI mosaics: {e}")
                return []

        # Sort by date (newest first)
        results.sort(key=lambda x: x.get("datetime", ""), reverse=True)
        return results

    @classmethod
    async def search_closest_mosaic(
        cls,
        bounds: tuple[float, float, float, float],
        target_date: str,
        max_months_range: int = 6,
    ) -> Optional[dict]:
        """
        Search for the mosaic closest to a target date.

        Args:
            bounds: (min_lon, min_lat, max_lon, max_lat)
            target_date: Target date (YYYY-MM-DD)
            max_months_range: Maximum months to search before/after target

        Returns:
            Best matching mosaic
        """
        target_dt = datetime.fromisoformat(target_date)
        date_start = (target_dt - timedelta(days=max_months_range * 30)).strftime("%Y-%m-%d")
        date_end = (target_dt + timedelta(days=max_months_range * 30)).strftime("%Y-%m-%d")

        mosaics = await cls.search_mosaics(bounds, date_start, date_end)

        if not mosaics:
            print(f"No NICFI mosaics found within {max_months_range} months of {target_date}")
            return None

        # Calculate distance from target date for each mosaic
        for mosaic in mosaics:
            mosaic_date_str = mosaic.get("datetime", "")
            if mosaic_date_str:
                try:
                    mosaic_date = datetime.fromisoformat(mosaic_date_str)
                    mosaic["days_from_target"] = abs((mosaic_date - target_dt).days)
                except:
                    mosaic["days_from_target"] = 999
            else:
                mosaic["days_from_target"] = 999

        # Sort by days from target
        mosaics.sort(key=lambda x: x["days_from_target"])

        best = mosaics[0]
        print(f"Found NICFI mosaic {best['name']} - {best['days_from_target']} days from target")
        return best

    @classmethod
    async def download_mosaic_tile(
        cls,
        mosaic_id: str,
        bounds: tuple[float, float, float, float],
        output_dir: Optional[str] = None,
    ) -> Optional[str]:
        """
        Download a tile from a NICFI mosaic for the given bounds.

        Args:
            mosaic_id: NICFI mosaic ID
            bounds: (min_lon, min_lat, max_lon, max_lat)
            output_dir: Directory to save the tile

        Returns:
            Path to downloaded file or None
        """
        api_key = cls.get_api_key()
        if not api_key:
            raise ValueError("PLANET_API_KEY not configured")

        min_lon, min_lat, max_lon, max_lat = bounds
        output_dir = output_dir or getattr(settings, "UPLOAD_DIR", "/tmp/hackathon_uploads")
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        # Create a GeoJSON for the bounding box
        bbox_geojson = {
            "type": "Polygon",
            "coordinates": [[
                [min_lon, min_lat],
                [max_lon, min_lat],
                [max_lon, max_lat],
                [min_lon, max_lat],
                [min_lon, min_lat],
            ]]
        }

        async with httpx.AsyncClient() as client:
            try:
                # Get mosaic quads that intersect with our bounds
                response = await client.get(
                    f"{cls.BASE_URL}/basemaps/v1/mosaics/{mosaic_id}/quads",
                    params={
                        "bbox": f"{min_lon},{min_lat},{max_lon},{max_lat}",
                    },
                    auth=(api_key, ""),
                    timeout=30.0,
                )

                if response.status_code != 200:
                    print(f"Failed to get NICFI quads: {response.status_code}")
                    return None

                quads_data = response.json()
                quads = quads_data.get("items", [])

                if not quads:
                    print("No NICFI quads found for this area")
                    return None

                # Get the first quad that covers our area
                quad = quads[0]
                quad_id = quad.get("id")

                # Get download link for the quad
                download_url = quad.get("_links", {}).get("download")

                if not download_url:
                    # Try to construct the download URL
                    download_url = f"{cls.BASE_URL}/basemaps/v1/mosaics/{mosaic_id}/quads/{quad_id}/full"

                # Download the quad
                print(f"Downloading NICFI quad {quad_id}...")
                download_response = await client.get(
                    download_url,
                    auth=(api_key, ""),
                    timeout=120.0,
                    follow_redirects=True,
                )

                if download_response.status_code == 200:
                    # Determine file extension
                    content_type = download_response.headers.get("content-type", "")
                    ext = ".tif" if "tiff" in content_type else ".png"

                    output_path = Path(output_dir) / f"nicfi_{mosaic_id}_{quad_id}{ext}"
                    output_path.write_bytes(download_response.content)
                    print(f"Downloaded NICFI tile to {output_path}")
                    return str(output_path)
                else:
                    print(f"Failed to download NICFI quad: {download_response.status_code}")
                    return None

            except Exception as e:
                print(f"Error downloading NICFI tile: {e}")
                import traceback
                traceback.print_exc()
                return None

    @classmethod
    async def download_image_pair(
        cls,
        bounds: tuple[float, float, float, float],
        date_before: str,
        date_after: str,
        date_range_days: int = 180,
        output_dir: Optional[str] = None,
    ) -> Optional[dict]:
        """
        Download a pair of NICFI mosaics for before/after comparison.

        Args:
            bounds: Bounding box
            date_before: Target date for "before" image
            date_after: Target date for "after" image
            date_range_days: Maximum days to search around target date
            output_dir: Directory to save images

        Returns:
            dict with before and after image info
        """
        # Check tropical coverage first
        is_covered, region_name, countries = cls.check_tropical_coverage(bounds)
        if not is_covered:
            raise ValueError(
                f"Area fora da cobertura NICFI. "
                f"NICFI cobre apenas florestas tropicais: "
                f"Amazonia, Bacia do Congo, Sudeste Asiatico, America Central, Africa Ocidental."
            )

        print(f"NICFI coverage confirmed: {region_name}")

        min_lon, min_lat, max_lon, max_lat = bounds
        output_dir = output_dir or getattr(settings, "UPLOAD_DIR", "/tmp/hackathon_uploads")

        # Convert days to months for NICFI (monthly mosaics)
        max_months = max(3, date_range_days // 30)

        # Find closest mosaic to "before" date
        print(f"Searching NICFI mosaic closest to 'before' date: {date_before}")
        before_mosaic = await cls.search_closest_mosaic(
            bounds, date_before, max_months_range=max_months
        )

        before_image = None
        if before_mosaic:
            filepath = await cls.download_mosaic_tile(
                before_mosaic["id"], bounds, output_dir
            )
            if filepath:
                before_image = {
                    "id": str(uuid.uuid4()),
                    "filepath": filepath,
                    "date": before_mosaic.get("datetime", date_before)[:10],
                    "days_from_target": before_mosaic.get("days_from_target", 0),
                    "bounds": {"min_lon": min_lon, "min_lat": min_lat, "max_lon": max_lon, "max_lat": max_lat},
                    "crs": "EPSG:4326",
                    "width": 0,  # Will be determined from file
                    "height": 0,
                    "scale": 4.77,
                    "satellite": "NICFI Tropical",
                    "cloud_cover": 0,  # Mosaics are cloud-free composites
                    "source": "NICFI",
                    "region": region_name,
                    "mosaic_name": before_mosaic.get("name"),
                }

        # Find closest mosaic to "after" date
        print(f"Searching NICFI mosaic closest to 'after' date: {date_after}")
        after_mosaic = await cls.search_closest_mosaic(
            bounds, date_after, max_months_range=max_months
        )

        after_image = None
        if after_mosaic:
            filepath = await cls.download_mosaic_tile(
                after_mosaic["id"], bounds, output_dir
            )
            if filepath:
                after_image = {
                    "id": str(uuid.uuid4()),
                    "filepath": filepath,
                    "date": after_mosaic.get("datetime", date_after)[:10],
                    "days_from_target": after_mosaic.get("days_from_target", 0),
                    "bounds": {"min_lon": min_lon, "min_lat": min_lat, "max_lon": max_lon, "max_lat": max_lat},
                    "crs": "EPSG:4326",
                    "width": 0,
                    "height": 0,
                    "scale": 4.77,
                    "satellite": "NICFI Tropical",
                    "cloud_cover": 0,
                    "source": "NICFI",
                    "region": region_name,
                    "mosaic_name": after_mosaic.get("name"),
                }

        if before_image and after_image:
            return {"before": before_image, "after": after_image}
        elif before_image:
            return {"before": before_image, "after": None}
        elif after_image:
            return {"before": None, "after": after_image}
        else:
            return None
