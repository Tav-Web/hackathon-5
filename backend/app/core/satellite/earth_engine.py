"""
Google Earth Engine integration for satellite image download.
"""
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

import ee
import requests
import rasterio
from rasterio.crs import CRS

from app.config import settings


class EarthEngineService:
    """Service for downloading satellite images from Google Earth Engine."""

    _initialized = False

    @classmethod
    def initialize(cls):
        """Initialize Earth Engine with service account or default credentials."""
        if cls._initialized:
            return

        try:
            # Get credentials from settings
            project_id = settings.GEE_PROJECT_ID
            key_file = settings.GEE_SERVICE_ACCOUNT_KEY

            if key_file and os.path.exists(key_file):
                # Use service account credentials
                credentials = ee.ServiceAccountCredentials(None, key_file)
                ee.Initialize(credentials, project=project_id)
                print(f"Earth Engine initialized with service account (project: {project_id})")
            elif project_id:
                # Use application default credentials with project
                ee.Initialize(project=project_id, opt_url='https://earthengine-highvolume.googleapis.com')
                print(f"Earth Engine initialized with default credentials (project: {project_id})")
            else:
                # Fallback to default initialization
                ee.Initialize(opt_url='https://earthengine-highvolume.googleapis.com')
                print("Earth Engine initialized with default credentials")

            cls._initialized = True
        except Exception as e:
            print(f"Warning: Earth Engine initialization failed: {e}")
            print("You may need to run 'earthengine authenticate' first")
            raise

    @classmethod
    def get_sentinel2_image(
        cls,
        bounds: tuple[float, float, float, float],  # (min_lon, min_lat, max_lon, max_lat)
        date_start: str,
        date_end: str,
        cloud_cover_max: int = 10,  # Reduced from 20 for better image quality
    ) -> Optional[ee.Image]:
        """
        Get a Sentinel-2 image for the given area and date range.

        Args:
            bounds: Bounding box (min_lon, min_lat, max_lon, max_lat)
            date_start: Start date (YYYY-MM-DD)
            date_end: End date (YYYY-MM-DD)
            cloud_cover_max: Maximum cloud cover percentage

        Returns:
            ee.Image or None if no image found
        """
        cls.initialize()

        # Create geometry from bounds
        min_lon, min_lat, max_lon, max_lat = bounds
        geometry = ee.Geometry.Rectangle([min_lon, min_lat, max_lon, max_lat])

        # Get Sentinel-2 Surface Reflectance collection
        collection = (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterBounds(geometry)
            .filterDate(date_start, date_end)
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", cloud_cover_max))
            .sort("CLOUDY_PIXEL_PERCENTAGE")
        )

        # Check if collection has images
        count = collection.size().getInfo()
        if count == 0:
            return None

        # Get the least cloudy image
        image = collection.first()

        # Select bands for spectral analysis
        # B4=Red, B3=Green, B2=Blue, B8=NIR, B11=SWIR1, B12=SWIR2
        # These bands enable NDVI, NDBI, NDWI calculations
        image = image.select(["B4", "B3", "B2", "B8", "B11", "B12"])

        return image.clip(geometry)

    @classmethod
    async def download_image(
        cls,
        bounds: tuple[float, float, float, float],
        date_start: str,
        date_end: str,
        output_dir: Optional[str] = None,
        scale: int = 10,  # 10m resolution for Sentinel-2
    ) -> Optional[dict]:
        """
        Download a Sentinel-2 GeoTIFF for the given area and date range.

        Args:
            bounds: Bounding box (min_lon, min_lat, max_lon, max_lat)
            date_start: Start date (YYYY-MM-DD)
            date_end: End date (YYYY-MM-DD)
            output_dir: Directory to save the image
            scale: Resolution in meters

        Returns:
            dict with image info and filepath, or None if failed
        """
        # Use exact bounds selected by user (no expansion)
        image = cls.get_sentinel2_image(bounds, date_start, date_end)
        if image is None:
            return None

        # Calculate approximate pixel dimensions
        min_lon, min_lat, max_lon, max_lat = bounds
        # Approximate: 1 degree latitude = 111km, 1 degree longitude = 111km * cos(lat)
        import math
        avg_lat = (min_lat + max_lat) / 2
        width_deg = max_lon - min_lon
        height_deg = max_lat - min_lat
        width_m = width_deg * 111000 * math.cos(math.radians(avg_lat))
        height_m = height_deg * 111000

        # Calculate pixels at given scale
        width_px = int(width_m / scale)
        height_px = int(height_m / scale)

        # Ensure minimum size for good quality
        min_pixels = 512
        if width_px < min_pixels or height_px < min_pixels:
            scale_factor = max(min_pixels / max(width_px, 1), min_pixels / max(height_px, 1))
            # Reduce scale to get more pixels (finer resolution)
            scale = max(1, int(scale / scale_factor))
            print(f"Adjusted scale to {scale}m for better image quality")

        # Get image info
        info = image.getInfo()
        image_date = datetime.fromtimestamp(
            info["properties"].get("system:time_start", 0) / 1000
        ).strftime("%Y-%m-%d")

        # Generate download URL with exact user bounds
        min_lon, min_lat, max_lon, max_lat = bounds
        region = ee.Geometry.Rectangle([min_lon, min_lat, max_lon, max_lat])

        url = image.getDownloadURL({
            "scale": scale,
            "crs": "EPSG:4326",
            "region": region,
            "format": "GEO_TIFF",
        })

        # Download the image
        output_dir = output_dir or settings.UPLOAD_DIR
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        image_id = str(uuid.uuid4())
        filepath = Path(output_dir) / f"{image_id}.tif"

        response = requests.get(url, timeout=300)
        response.raise_for_status()

        with open(filepath, "wb") as f:
            f.write(response.content)

        # Get geospatial info from the downloaded file
        with rasterio.open(filepath) as src:
            transform = src.transform
            crs = src.crs.to_string() if src.crs else "EPSG:4326"
            width = src.width
            height = src.height
            bounds_actual = src.bounds

        # Store bounds from downloaded image (should match user selection)
        return {
            "id": image_id,
            "filepath": str(filepath),
            "date": image_date,
            "bounds": {
                "min_lon": bounds_actual.left,
                "min_lat": bounds_actual.bottom,
                "max_lon": bounds_actual.right,
                "max_lat": bounds_actual.top,
            },
            "original_bounds": {
                "min_lon": bounds[0],
                "min_lat": bounds[1],
                "max_lon": bounds[2],
                "max_lat": bounds[3],
            },
            "crs": crs,
            "width": width,
            "height": height,
            "scale": scale,
            "satellite": "Sentinel-2",
            "cloud_cover": info["properties"].get("CLOUDY_PIXEL_PERCENTAGE", 0),
        }

    @classmethod
    async def download_image_pair(
        cls,
        bounds: tuple[float, float, float, float],
        date_before: str,
        date_after: str,
        date_range_days: int = 30,
        output_dir: Optional[str] = None,
    ) -> Optional[dict]:
        """
        Download a pair of images for before/after comparison.

        Args:
            bounds: Bounding box
            date_before: Target date for "before" image
            date_after: Target date for "after" image
            date_range_days: Number of days to search around target date
            output_dir: Directory to save images

        Returns:
            dict with before and after image info
        """
        from datetime import timedelta

        # Calculate date ranges
        date_before_dt = datetime.strptime(date_before, "%Y-%m-%d")
        date_after_dt = datetime.strptime(date_after, "%Y-%m-%d")
        delta = timedelta(days=date_range_days)

        # Download before image
        before_start = (date_before_dt - delta).strftime("%Y-%m-%d")
        before_end = (date_before_dt + delta).strftime("%Y-%m-%d")
        before_image = await cls.download_image(bounds, before_start, before_end, output_dir)

        if before_image is None:
            return None

        # Download after image
        after_start = (date_after_dt - delta).strftime("%Y-%m-%d")
        after_end = (date_after_dt + delta).strftime("%Y-%m-%d")
        after_image = await cls.download_image(bounds, after_start, after_end, output_dir)

        if after_image is None:
            return None

        return {
            "before": before_image,
            "after": after_image,
        }
