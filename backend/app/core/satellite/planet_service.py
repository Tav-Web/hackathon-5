"""
Planet Labs integration for high-resolution satellite imagery.
Uses Planet Developer Trial (free for non-commercial use).
Resolution: ~3m/pixel (vs 10m for Sentinel-2)
"""
import os
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import numpy as np
import rasterio
from rasterio.transform import from_bounds

from app.config import settings


class PlanetService:
    """Service for downloading satellite images from Planet Labs."""

    _client = None

    @classmethod
    def get_client(cls):
        """Get or create Planet client."""
        if cls._client is None:
            try:
                from planet import Auth
                from planet.sync.client import Planet, Session
            except ImportError:
                raise ImportError(
                    "Planet SDK not installed. Run: pip install planet>=2.0.0"
                )

            api_key = os.getenv("PLANET_API_KEY") or getattr(
                settings, "PLANET_API_KEY", None
            )

            if not api_key:
                raise ValueError(
                    "PLANET_API_KEY not configured. "
                    "Get a free Developer Trial key at: "
                    "https://www.planet.com/pulse/announcing-planets-developer-trial-program/"
                )

            # Planet SDK v3+ uses Session with Auth for authentication
            auth = Auth.from_key(api_key)
            session = Session(auth=auth)
            cls._client = Planet(session=session)
            print(f"Planet client initialized with API key: {api_key[:10]}...")

        return cls._client

    @classmethod
    def is_available(cls) -> bool:
        """Check if Planet service is available (API key configured)."""
        api_key = os.getenv("PLANET_API_KEY") or getattr(
            settings, "PLANET_API_KEY", None
        )
        return bool(api_key)

    @classmethod
    async def search_images(
        cls,
        bounds: tuple[float, float, float, float],
        date_start: str,
        date_end: str,
        cloud_cover_max: int = 20,
    ) -> list[dict]:
        """
        Search for available PlanetScope images.

        Args:
            bounds: (min_lon, min_lat, max_lon, max_lat)
            date_start: Start date (YYYY-MM-DD)
            date_end: End date (YYYY-MM-DD)
            cloud_cover_max: Maximum cloud cover percentage

        Returns:
            List of available images with metadata
        """
        from planet import data_filter

        pl = cls.get_client()

        min_lon, min_lat, max_lon, max_lat = bounds

        # Create GeoJSON geometry for the bounding box
        geom = {
            "type": "Polygon",
            "coordinates": [
                [
                    [min_lon, min_lat],  # SW
                    [max_lon, min_lat],  # SE
                    [max_lon, max_lat],  # NE
                    [min_lon, max_lat],  # NW
                    [min_lon, min_lat],  # Close polygon
                ]
            ],
        }

        # Build search filter
        # Note: Removed permission_filter() - it filters out all images for Developer Trial keys
        # We'll handle download permission errors separately
        sfilter = data_filter.and_filter(
            [
                data_filter.geometry_filter(geom),
                data_filter.date_range_filter(
                    "acquired",
                    gt=datetime.fromisoformat(date_start),
                    lt=datetime.fromisoformat(date_end) + timedelta(days=1),
                ),
                data_filter.range_filter("cloud_cover", lt=cloud_cover_max / 100),
            ]
        )

        results = []
        try:
            for item in pl.data.search(["PSScene"], search_filter=sfilter, limit=10):
                results.append(
                    {
                        "id": item["id"],
                        "datetime": item["properties"]["acquired"],
                        "cloud_cover": item["properties"].get("cloud_cover", 0) * 100,
                        "geometry": item["geometry"],
                        "properties": item["properties"],
                    }
                )
        except Exception as e:
            print(f"Error searching Planet images: {e}")
            return []

        # Sort by cloud cover (lowest first)
        results.sort(key=lambda x: x["cloud_cover"])

        return results

    @classmethod
    async def search_closest_image(
        cls,
        bounds: tuple[float, float, float, float],
        target_date: str,
        max_days_range: int = 60,
        cloud_cover_max: int = 30,
    ) -> Optional[dict]:
        """
        Search for the image closest to a target date.

        Args:
            bounds: (min_lon, min_lat, max_lon, max_lat)
            target_date: Target date (YYYY-MM-DD)
            max_days_range: Maximum days to search before/after target
            cloud_cover_max: Maximum cloud cover percentage

        Returns:
            Best matching image (closest to target date with low cloud cover)
        """
        from planet import data_filter

        pl = cls.get_client()
        target_dt = datetime.fromisoformat(target_date)

        min_lon, min_lat, max_lon, max_lat = bounds

        # Create GeoJSON geometry for the bounding box
        geom = {
            "type": "Polygon",
            "coordinates": [
                [
                    [min_lon, min_lat],
                    [max_lon, min_lat],
                    [max_lon, max_lat],
                    [min_lon, max_lat],
                    [min_lon, min_lat],
                ]
            ],
        }

        # Search in a wider range around target date
        date_start = (target_dt - timedelta(days=max_days_range)).strftime("%Y-%m-%d")
        date_end = (target_dt + timedelta(days=max_days_range)).strftime("%Y-%m-%d")

        # Note: Removed permission_filter() - it filters out all images for Developer Trial keys
        # We'll handle download permission errors separately
        sfilter = data_filter.and_filter(
            [
                data_filter.geometry_filter(geom),
                data_filter.date_range_filter(
                    "acquired",
                    gt=datetime.fromisoformat(date_start),
                    lt=datetime.fromisoformat(date_end) + timedelta(days=1),
                ),
                data_filter.range_filter("cloud_cover", lt=cloud_cover_max / 100),
            ]
        )

        results = []
        try:
            for item in pl.data.search(["PSScene"], search_filter=sfilter, limit=50):
                acq_datetime = item["properties"]["acquired"]
                if "T" in acq_datetime:
                    acq_date = datetime.fromisoformat(acq_datetime.replace("Z", "+00:00")).replace(tzinfo=None)
                else:
                    acq_date = datetime.fromisoformat(acq_datetime)

                # Calculate days difference from target
                days_diff = abs((acq_date - target_dt).days)

                results.append(
                    {
                        "id": item["id"],
                        "datetime": acq_datetime,
                        "cloud_cover": item["properties"].get("cloud_cover", 0) * 100,
                        "geometry": item["geometry"],
                        "properties": item["properties"],
                        "days_from_target": days_diff,
                    }
                )
        except Exception as e:
            print(f"Error searching Planet images: {e}")
            return None

        if not results:
            print(f"No Planet images found within {max_days_range} days of {target_date}")
            return None

        # Sort by: 1) days from target (closest first), 2) cloud cover (lowest)
        results.sort(key=lambda x: (x["days_from_target"], x["cloud_cover"]))

        best = results[0]
        print(f"Found Planet image {best['id']} - {best['days_from_target']} days from target, {best['cloud_cover']:.1f}% clouds")

        return best

    @classmethod
    async def download_image(
        cls,
        bounds: tuple[float, float, float, float],
        date_start: str,
        date_end: str,
        output_dir: Optional[str] = None,
        cloud_cover_max: int = 20,
    ) -> Optional[dict]:
        """
        Download a PlanetScope image for the given area and date range.

        Args:
            bounds: (min_lon, min_lat, max_lon, max_lat)
            date_start: Start date (YYYY-MM-DD)
            date_end: End date (YYYY-MM-DD)
            output_dir: Directory to save the image
            cloud_cover_max: Maximum cloud cover percentage

        Returns:
            dict with image info and filepath, or None if failed
        """
        try:
            pl = cls.get_client()

            min_lon, min_lat, max_lon, max_lat = bounds

            # Search for images
            images = await cls.search_images(
                bounds, date_start, date_end, cloud_cover_max
            )

            if not images:
                print(f"No Planet images found for {date_start} to {date_end}")
                return None

            # Get the best image (lowest cloud cover)
            best_image = images[0]
            item_id = best_image["id"]
            print(f"Found Planet image: {item_id} with {best_image['cloud_cover']:.1f}% clouds")

            # Get asset (ortho_visual for RGB preview)
            asset_type = "ortho_visual"
            try:
                asset = pl.data.get_asset("PSScene", item_id, asset_type)
            except Exception as e:
                # Check if it's a permission error (Developer Trial limitation)
                if "must be one of []" in str(e):
                    print(f"Planet API permission denied: Developer Trial cannot download images")
                    raise PermissionError(
                        "Planet Developer Trial não permite download. Use Earth Engine ou Sentinel."
                    )
                # Try alternative asset type
                asset_type = "ortho_analytic_4b"
                try:
                    asset = pl.data.get_asset("PSScene", item_id, asset_type)
                except Exception as e2:
                    if "must be one of []" in str(e2):
                        raise PermissionError(
                            "Planet Developer Trial não permite download. Use Earth Engine ou Sentinel."
                        )
                    raise

            # Activate asset if needed
            if asset.get("status") != "active":
                print(f"Activating Planet asset {asset_type}...")
                pl.data.activate_asset(asset)

                # Wait for activation (with timeout)
                asset = pl.data.wait_asset(asset, callback=lambda a: print(f"  Status: {a.get('status')}"))

            # Download asset
            output_dir = output_dir or getattr(settings, "UPLOAD_DIR", "/tmp/hackathon_uploads")
            Path(output_dir).mkdir(parents=True, exist_ok=True)

            print(f"Downloading Planet image to {output_dir}...")
            downloaded_path = pl.data.download_asset(asset, directory=output_dir)

            # Get image dimensions
            width = best_image["properties"].get("columns", 0)
            height = best_image["properties"].get("rows", 0)

            # If dimensions not in metadata, read from file
            if width == 0 or height == 0:
                try:
                    with rasterio.open(downloaded_path) as src:
                        width = src.width
                        height = src.height
                except Exception:
                    # Estimate based on bounds and 3m resolution
                    import math
                    center_lat = (min_lat + max_lat) / 2
                    cos_lat = math.cos(math.radians(center_lat))
                    width_km = (max_lon - min_lon) * 111 * cos_lat
                    height_km = (max_lat - min_lat) * 111
                    width = int(width_km * 1000 / 3)  # 3m resolution
                    height = int(height_km * 1000 / 3)

            # Parse acquisition date
            acq_datetime = best_image["datetime"]
            if "T" in acq_datetime:
                image_date = acq_datetime.split("T")[0]
            else:
                image_date = acq_datetime[:10]

            image_id = str(uuid.uuid4())

            return {
                "id": image_id,
                "filepath": str(downloaded_path),
                "date": image_date,
                "bounds": {
                    "min_lon": min_lon,
                    "min_lat": min_lat,
                    "max_lon": max_lon,
                    "max_lat": max_lat,
                },
                "original_bounds": {
                    "min_lon": min_lon,
                    "min_lat": min_lat,
                    "max_lon": max_lon,
                    "max_lat": max_lat,
                },
                "crs": "EPSG:4326",
                "width": width,
                "height": height,
                "scale": 3,  # PlanetScope resolution ~3m/pixel
                "satellite": "PlanetScope",
                "cloud_cover": best_image["cloud_cover"],
                "source": "Planet",
                "planet_id": item_id,
            }

        except Exception as e:
            print(f"Error downloading from Planet: {e}")
            import traceback
            traceback.print_exc()
            return None

    @classmethod
    async def download_closest_image(
        cls,
        bounds: tuple[float, float, float, float],
        target_date: str,
        output_dir: Optional[str] = None,
        max_days_range: int = 60,
        cloud_cover_max: int = 30,
    ) -> Optional[dict]:
        """
        Download the image closest to a target date.

        Args:
            bounds: (min_lon, min_lat, max_lon, max_lat)
            target_date: Target date (YYYY-MM-DD)
            output_dir: Directory to save the image
            max_days_range: Maximum days to search before/after target
            cloud_cover_max: Maximum cloud cover percentage

        Returns:
            dict with image info and filepath, or None if failed
        """
        try:
            pl = cls.get_client()
            min_lon, min_lat, max_lon, max_lat = bounds

            # Find closest image
            best_image = await cls.search_closest_image(
                bounds, target_date, max_days_range, cloud_cover_max
            )

            if not best_image:
                return None

            item_id = best_image["id"]
            print(f"Downloading Planet image: {item_id}")

            # Get asset (ortho_visual for RGB preview)
            asset_type = "ortho_visual"
            try:
                asset = pl.data.get_asset("PSScene", item_id, asset_type)
            except Exception as e:
                # Check if it's a permission error (Developer Trial limitation)
                if "must be one of []" in str(e):
                    print(f"Planet API permission denied: Developer Trial cannot download images")
                    raise PermissionError(
                        "Planet Developer Trial não permite download. Use Earth Engine ou Sentinel."
                    )
                # Try alternative asset type
                asset_type = "ortho_analytic_4b"
                try:
                    asset = pl.data.get_asset("PSScene", item_id, asset_type)
                except Exception as e2:
                    if "must be one of []" in str(e2):
                        raise PermissionError(
                            "Planet Developer Trial não permite download. Use Earth Engine ou Sentinel."
                        )
                    raise

            # Activate asset if needed
            if asset.get("status") != "active":
                print(f"Activating Planet asset {asset_type}...")
                pl.data.activate_asset(asset)
                asset = pl.data.wait_asset(asset, callback=lambda a: print(f"  Status: {a.get('status')}"))

            # Download asset
            output_dir = output_dir or getattr(settings, "UPLOAD_DIR", "/tmp/hackathon_uploads")
            Path(output_dir).mkdir(parents=True, exist_ok=True)

            print(f"Downloading Planet image to {output_dir}...")
            downloaded_path = pl.data.download_asset(asset, directory=output_dir)

            # Get image dimensions
            width = best_image["properties"].get("columns", 0)
            height = best_image["properties"].get("rows", 0)

            if width == 0 or height == 0:
                try:
                    with rasterio.open(downloaded_path) as src:
                        width = src.width
                        height = src.height
                except Exception:
                    import math
                    center_lat = (min_lat + max_lat) / 2
                    cos_lat = math.cos(math.radians(center_lat))
                    width_km = (max_lon - min_lon) * 111 * cos_lat
                    height_km = (max_lat - min_lat) * 111
                    width = int(width_km * 1000 / 3)
                    height = int(height_km * 1000 / 3)

            # Parse acquisition date
            acq_datetime = best_image["datetime"]
            if "T" in acq_datetime:
                image_date = acq_datetime.split("T")[0]
            else:
                image_date = acq_datetime[:10]

            image_id = str(uuid.uuid4())

            return {
                "id": image_id,
                "filepath": str(downloaded_path),
                "date": image_date,
                "target_date": target_date,
                "days_from_target": best_image.get("days_from_target", 0),
                "bounds": {
                    "min_lon": min_lon,
                    "min_lat": min_lat,
                    "max_lon": max_lon,
                    "max_lat": max_lat,
                },
                "original_bounds": {
                    "min_lon": min_lon,
                    "min_lat": min_lat,
                    "max_lon": max_lon,
                    "max_lat": max_lat,
                },
                "crs": "EPSG:4326",
                "width": width,
                "height": height,
                "scale": 3,
                "satellite": "PlanetScope",
                "cloud_cover": best_image["cloud_cover"],
                "source": "Planet",
                "planet_id": item_id,
            }

        except Exception as e:
            print(f"Error downloading closest image from Planet: {e}")
            import traceback
            traceback.print_exc()
            return None

    @classmethod
    async def download_image_pair(
        cls,
        bounds: tuple[float, float, float, float],
        date_before: str,
        date_after: str,
        date_range_days: int = 60,
        output_dir: Optional[str] = None,
    ) -> Optional[dict]:
        """
        Download a pair of images for before/after comparison.
        Finds the closest available images to each target date.

        Args:
            bounds: Bounding box
            date_before: Target date for "before" image
            date_after: Target date for "after" image
            date_range_days: Maximum days to search around target date
            output_dir: Directory to save images

        Returns:
            dict with before and after image info
        """
        print(f"Searching Planet image closest to 'before' date: {date_before}")
        before_image = await cls.download_closest_image(
            bounds, date_before, output_dir, max_days_range=date_range_days
        )

        if before_image is None:
            print("Failed to download 'before' image from Planet")
            return None

        print(f"  -> Found image from {before_image['date']} ({before_image['days_from_target']} days from target)")

        print(f"Searching Planet image closest to 'after' date: {date_after}")
        after_image = await cls.download_closest_image(
            bounds, date_after, output_dir, max_days_range=date_range_days
        )

        if after_image is None:
            print("Failed to download 'after' image from Planet")
            return None

        print(f"  -> Found image from {after_image['date']} ({after_image['days_from_target']} days from target)")

        return {
            "before": before_image,
            "after": after_image,
        }
