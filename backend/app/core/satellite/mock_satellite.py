"""
Mock satellite service for demo/testing without Earth Engine authentication.
Generates synthetic satellite images with realistic spectral bands.
"""
import uuid
import numpy as np
import rasterio
from rasterio.transform import from_bounds
from pathlib import Path
from typing import Optional
from datetime import datetime, timedelta
import random

from app.config import settings


class MockSatelliteService:
    """
    Mock service that generates synthetic satellite images for testing.
    Simulates Sentinel-2 data with 6 bands: B4, B3, B2, B8, B11, B12
    """

    @classmethod
    async def download_image(
        cls,
        bounds: tuple[float, float, float, float],
        date_start: str,
        date_end: str,
        output_dir: Optional[str] = None,
        scale: int = 10,
        add_changes: bool = False,
    ) -> Optional[dict]:
        """
        Generate a synthetic satellite image for testing.

        Args:
            bounds: Bounding box (min_lon, min_lat, max_lon, max_lat)
            date_start: Start date (YYYY-MM-DD)
            date_end: End date (YYYY-MM-DD)
            output_dir: Directory to save the image
            scale: Resolution in meters (default 10m for Sentinel-2)
            add_changes: If True, add synthetic changes to the image

        Returns:
            dict with image info and filepath
        """
        min_lon, min_lat, max_lon, max_lat = bounds

        # Calculate image dimensions based on bounds and scale
        # Approximate degrees to meters (at equator: 1 degree ≈ 111km)
        width_deg = max_lon - min_lon
        height_deg = max_lat - min_lat

        # Image size (minimum 100x100, maximum 1000x1000)
        width = min(max(int(width_deg * 111000 / scale), 100), 1000)
        height = min(max(int(height_deg * 111000 / scale), 100), 1000)

        # Generate synthetic bands
        # Create base terrain patterns
        x = np.linspace(0, 4 * np.pi, width)
        y = np.linspace(0, 4 * np.pi, height)
        xx, yy = np.meshgrid(x, y)

        # Base pattern with some randomness
        base = np.sin(xx) * np.cos(yy) + np.random.rand(height, width) * 0.3

        # Generate realistic band values (Sentinel-2 surface reflectance ranges)
        # Values typically 0-10000 for SR products

        # Vegetation areas (high NIR, low Red)
        vegetation_mask = (base > 0.3).astype(np.float32)

        # Urban areas (high SWIR, moderate NIR)
        urban_mask = ((base > -0.2) & (base < 0.1)).astype(np.float32)

        # Water areas (low everything, especially NIR)
        water_mask = (base < -0.5).astype(np.float32)

        # B4 - Red (higher in bare soil, lower in vegetation)
        b4 = (1500 + base * 500 + np.random.rand(height, width) * 200).astype(np.float32)
        b4 = b4 * (1 - vegetation_mask * 0.5)  # Less red in vegetation

        # B3 - Green
        b3 = (1200 + base * 400 + np.random.rand(height, width) * 150).astype(np.float32)
        b3 = b3 * (1 + vegetation_mask * 0.3)  # More green in vegetation

        # B2 - Blue
        b2 = (1000 + base * 300 + np.random.rand(height, width) * 100).astype(np.float32)
        b2 = b2 * (1 + water_mask * 0.5)  # More blue in water

        # B8 - NIR (very high in vegetation, low in water)
        b8 = (2000 + base * 800 + np.random.rand(height, width) * 300).astype(np.float32)
        b8 = b8 * (1 + vegetation_mask * 1.5)  # Much higher in vegetation
        b8 = b8 * (1 - water_mask * 0.7)  # Much lower in water

        # B11 - SWIR1 (high in urban, low in water)
        b11 = (1800 + base * 600 + np.random.rand(height, width) * 250).astype(np.float32)
        b11 = b11 * (1 + urban_mask * 0.5)  # Higher in urban
        b11 = b11 * (1 - water_mask * 0.6)  # Lower in water
        b11 = b11 * (1 - vegetation_mask * 0.3)  # Lower in vegetation

        # B12 - SWIR2
        b12 = (1500 + base * 500 + np.random.rand(height, width) * 200).astype(np.float32)
        b12 = b12 * (1 + urban_mask * 0.4)
        b12 = b12 * (1 - water_mask * 0.5)

        # Add synthetic changes if requested (for "after" images)
        if add_changes:
            # Add some deforestation patches
            for _ in range(random.randint(2, 5)):
                cx, cy = random.randint(50, width-50), random.randint(50, height-50)
                radius = random.randint(10, 30)
                yy_patch, xx_patch = np.ogrid[:height, :width]
                mask = ((xx_patch - cx)**2 + (yy_patch - cy)**2) < radius**2

                # Deforestation: reduce NIR, increase Red
                b8[mask] *= 0.4
                b4[mask] *= 1.5
                b11[mask] *= 1.3

            # Add some construction patches
            for _ in range(random.randint(1, 3)):
                cx, cy = random.randint(50, width-50), random.randint(50, height-50)
                size = random.randint(15, 40)
                x1, y1 = max(0, cx-size//2), max(0, cy-size//2)
                x2, y2 = min(width, cx+size//2), min(height, cy+size//2)

                # Construction: increase SWIR, moderate NIR
                b11[y1:y2, x1:x2] *= 1.4
                b8[y1:y2, x1:x2] *= 0.7
                b4[y1:y2, x1:x2] *= 1.2

        # Ensure all values are positive
        b4 = np.maximum(b4, 100)
        b3 = np.maximum(b3, 100)
        b2 = np.maximum(b2, 100)
        b8 = np.maximum(b8, 100)
        b11 = np.maximum(b11, 100)
        b12 = np.maximum(b12, 100)

        # Stack bands
        data = np.stack([b4, b3, b2, b8, b11, b12])

        # Create output directory
        output_dir = output_dir or settings.UPLOAD_DIR
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        # Generate file
        image_id = str(uuid.uuid4())
        filepath = Path(output_dir) / f"{image_id}.tif"

        # Create transform
        transform = from_bounds(min_lon, min_lat, max_lon, max_lat, width, height)

        # Write GeoTIFF
        with rasterio.open(
            filepath,
            'w',
            driver='GTiff',
            height=height,
            width=width,
            count=6,
            dtype=np.float32,
            crs='EPSG:4326',
            transform=transform,
        ) as dst:
            dst.write(data)
            dst.descriptions = ('B4-Red', 'B3-Green', 'B2-Blue', 'B8-NIR', 'B11-SWIR1', 'B12-SWIR2')

        # Parse dates and pick a random date in range
        start_dt = datetime.strptime(date_start, "%Y-%m-%d")
        end_dt = datetime.strptime(date_end, "%Y-%m-%d")
        random_days = random.randint(0, (end_dt - start_dt).days) if end_dt > start_dt else 0
        image_date = (start_dt + timedelta(days=random_days)).strftime("%Y-%m-%d")

        return {
            "id": image_id,
            "filepath": str(filepath),
            "date": image_date,
            "bounds": {
                "min_lon": min_lon,
                "min_lat": min_lat,
                "max_lon": max_lon,
                "max_lat": max_lat,
            },
            "crs": "EPSG:4326",
            "width": width,
            "height": height,
            "scale": scale,
            "satellite": "Mock-Sentinel-2",
            "cloud_cover": random.uniform(0, 10),
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
        Generate a pair of synthetic images with differences for change detection testing.
        """
        from datetime import timedelta

        # Calculate date ranges
        date_before_dt = datetime.strptime(date_before, "%Y-%m-%d")
        date_after_dt = datetime.strptime(date_after, "%Y-%m-%d")
        delta = timedelta(days=date_range_days)

        # Download "before" image (no changes)
        before_start = (date_before_dt - delta).strftime("%Y-%m-%d")
        before_end = (date_before_dt + delta).strftime("%Y-%m-%d")
        before_image = await cls.download_image(
            bounds, before_start, before_end, output_dir, add_changes=False
        )

        if before_image is None:
            return None

        # Download "after" image (with changes)
        after_start = (date_after_dt - delta).strftime("%Y-%m-%d")
        after_end = (date_after_dt + delta).strftime("%Y-%m-%d")
        after_image = await cls.download_image(
            bounds, after_start, after_end, output_dir, add_changes=True
        )

        if after_image is None:
            return None

        return {
            "before": before_image,
            "after": after_image,
        }
