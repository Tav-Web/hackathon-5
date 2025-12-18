"""
Sentinel Hub integration for high-quality satellite image download.
Uses Copernicus Data Space Ecosystem (free) or Sentinel Hub commercial.
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

# Sentinel Hub imports
from sentinelhub import (
    SHConfig,
    BBox,
    CRS,
    DataCollection,
    MimeType,
    SentinelHubRequest,
    SentinelHubCatalog,
    bbox_to_dimensions,
    Geometry,
)


class SentinelHubService:
    """Service for downloading satellite images from Sentinel Hub / Copernicus Data Space."""

    _config: Optional[SHConfig] = None
    _data_collection: Optional[DataCollection] = None
    _is_cdse: bool = False

    @classmethod
    def is_available(cls) -> bool:
        """Check if Sentinel Hub credentials are configured."""
        # Check Copernicus Data Space credentials (free)
        client_id = os.getenv("COPERNICUS_CLIENT_ID") or getattr(settings, "COPERNICUS_CLIENT_ID", None)
        client_secret = os.getenv("COPERNICUS_CLIENT_SECRET") or getattr(settings, "COPERNICUS_CLIENT_SECRET", None)
        if client_id and client_secret:
            # Strip quotes if present
            client_id = str(client_id).strip('"').strip("'")
            client_secret = str(client_secret).strip('"').strip("'")
            if client_id and client_secret:
                return True

        # Check commercial Sentinel Hub credentials
        sh_id = os.getenv("SH_CLIENT_ID") or getattr(settings, "SH_CLIENT_ID", None)
        sh_secret = os.getenv("SH_CLIENT_SECRET") or getattr(settings, "SH_CLIENT_SECRET", None)
        if sh_id and sh_secret:
            sh_id = str(sh_id).strip('"').strip("'")
            sh_secret = str(sh_secret).strip('"').strip("'")
            if sh_id and sh_secret:
                return True

        return False

    @classmethod
    def get_config(cls) -> SHConfig:
        """Get or create Sentinel Hub configuration."""
        if cls._config is None:
            cls._config = SHConfig()

            # Check for Copernicus Data Space credentials (free)
            client_id = os.getenv("COPERNICUS_CLIENT_ID") or getattr(settings, "COPERNICUS_CLIENT_ID", None)
            client_secret = os.getenv("COPERNICUS_CLIENT_SECRET") or getattr(settings, "COPERNICUS_CLIENT_SECRET", None)

            # Remove quotes if present
            if client_id:
                client_id = client_id.strip('"').strip("'")
            if client_secret:
                client_secret = client_secret.strip('"').strip("'")

            if client_id and client_secret:
                # Use Copernicus Data Space Ecosystem (free)
                cls._config.sh_client_id = client_id
                cls._config.sh_client_secret = client_secret
                cls._config.sh_base_url = "https://sh.dataspace.copernicus.eu"
                cls._config.sh_token_url = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
                cls._is_cdse = True
                print(f"Sentinel Hub configured with Copernicus Data Space credentials (client_id: {client_id[:10]}...)")
            else:
                # Check for commercial Sentinel Hub credentials
                sh_client_id = os.getenv("SH_CLIENT_ID") or getattr(settings, "SH_CLIENT_ID", None)
                sh_client_secret = os.getenv("SH_CLIENT_SECRET") or getattr(settings, "SH_CLIENT_SECRET", None)

                if sh_client_id and sh_client_secret:
                    cls._config.sh_client_id = sh_client_id
                    cls._config.sh_client_secret = sh_client_secret
                    cls._is_cdse = False
                    print("Sentinel Hub configured with commercial credentials")
                else:
                    raise ValueError(
                        "Sentinel Hub credentials not found. "
                        "Set COPERNICUS_CLIENT_ID/COPERNICUS_CLIENT_SECRET for free access, "
                        "or SH_CLIENT_ID/SH_CLIENT_SECRET for commercial access."
                    )

        return cls._config

    @classmethod
    def get_data_collection(cls) -> DataCollection:
        """Get the appropriate data collection for the configured service."""
        if cls._data_collection is None:
            cls.get_config()  # Ensure config is initialized
            if cls._is_cdse:
                # For Copernicus Data Space, define custom collection with CDSE service URL
                cls._data_collection = DataCollection.SENTINEL2_L2A.define_from(
                    "S2L2A_CDSE",
                    service_url="https://sh.dataspace.copernicus.eu"
                )
            else:
                cls._data_collection = DataCollection.SENTINEL2_L2A
        return cls._data_collection

    @classmethod
    def get_evalscript_true_color(cls) -> str:
        """Get evalscript for true color imagery with enhanced visualization."""
        return """
        //VERSION=3
        function setup() {
            return {
                input: [{
                    bands: ["B02", "B03", "B04"],
                    units: "DN"
                }],
                output: {
                    bands: 3,
                    sampleType: "AUTO"
                }
            };
        }

        function evaluatePixel(sample) {
            // Apply gain and gamma for better visualization
            let gain = 2.5;
            let gamma = 1.0;

            let r = Math.pow(sample.B04 * gain / 10000, 1/gamma);
            let g = Math.pow(sample.B03 * gain / 10000, 1/gamma);
            let b = Math.pow(sample.B02 * gain / 10000, 1/gamma);

            return [r, g, b];
        }
        """

    @classmethod
    def get_evalscript_all_bands(cls) -> str:
        """Get evalscript for downloading all spectral bands."""
        return """
        //VERSION=3
        function setup() {
            return {
                input: [{
                    bands: ["B02", "B03", "B04", "B08", "B11", "B12", "SCL"],
                    units: "DN"
                }],
                output: {
                    bands: 7,
                    sampleType: "INT16"
                }
            };
        }

        function evaluatePixel(sample) {
            return [sample.B04, sample.B03, sample.B02, sample.B08, sample.B11, sample.B12, sample.SCL];
        }
        """

    @classmethod
    async def search_images(
        cls,
        bounds: tuple[float, float, float, float],
        date_start: str,
        date_end: str,
        cloud_cover_max: int = 10,  # Maximum 10% cloud cover
    ) -> list[dict]:
        """
        Search for available Sentinel-2 images.

        Args:
            bounds: (min_lon, min_lat, max_lon, max_lat)
            date_start: Start date (YYYY-MM-DD)
            date_end: End date (YYYY-MM-DD)
            cloud_cover_max: Maximum cloud cover percentage

        Returns:
            List of available images with metadata
        """
        config = cls.get_config()

        min_lon, min_lat, max_lon, max_lat = bounds
        bbox = BBox(bbox=[min_lon, min_lat, max_lon, max_lat], crs=CRS.WGS84)

        catalog = SentinelHubCatalog(config=config)

        search_iterator = catalog.search(
            cls.get_data_collection(),
            bbox=bbox,
            time=(date_start, date_end),
            filter=f"eo:cloud_cover < {cloud_cover_max}",
        )

        results = []
        for item in search_iterator:
            results.append({
                "id": item["id"],
                "datetime": item["properties"]["datetime"],
                "cloud_cover": item["properties"].get("eo:cloud_cover", 0),
                "geometry": item["geometry"],
            })

        # Sort by cloud cover (lowest first)
        results.sort(key=lambda x: x["cloud_cover"])

        return results

    @classmethod
    async def download_image(
        cls,
        bounds: tuple[float, float, float, float],
        date_start: str,
        date_end: str,
        output_dir: Optional[str] = None,
        resolution: int = 10,
        cloud_cover_max: int = 30,  # Increased default to 30% for better availability
    ) -> Optional[dict]:
        """
        Download a Sentinel-2 image for the given area and date range.
        Uses progressive search strategy to maximize chance of finding an image.

        Args:
            bounds: (min_lon, min_lat, max_lon, max_lat)
            date_start: Start date (YYYY-MM-DD)
            date_end: End date (YYYY-MM-DD)
            output_dir: Directory to save the image
            resolution: Resolution in meters (10, 20, or 60)
            cloud_cover_max: Maximum cloud cover percentage

        Returns:
            dict with image info and filepath, or None if failed
        """
        try:
            config = cls.get_config()

            min_lon, min_lat, max_lon, max_lat = bounds
            bbox = BBox(bbox=[min_lon, min_lat, max_lon, max_lat], crs=CRS.WGS84)

            # Progressive search strategy - try increasingly relaxed criteria
            search_strategies = [
                {"cloud_cover": 20, "days_expand": 0},    # Try 1: low cloud
                {"cloud_cover": 40, "days_expand": 0},    # Try 2: medium cloud
                {"cloud_cover": 60, "days_expand": 15},   # Try 3: high cloud + expand dates
                {"cloud_cover": 80, "days_expand": 30},   # Try 4: very high cloud + more dates
            ]

            target_date = datetime.strptime(date_end, "%Y-%m-%d")
            images = []

            for strategy in search_strategies:
                cc = strategy["cloud_cover"]
                expand = strategy["days_expand"]

                # Expand date range if needed
                search_start = (datetime.strptime(date_start, "%Y-%m-%d") - timedelta(days=expand)).strftime("%Y-%m-%d")
                search_end = (datetime.strptime(date_end, "%Y-%m-%d") + timedelta(days=expand)).strftime("%Y-%m-%d")

                images = await cls.search_images(bounds, search_start, search_end, cc)
                if images:
                    print(f"Found {len(images)} images with {cc}% cloud max, date range expanded by {expand} days")
                    # Sort by proximity to target date (closest first)
                    images.sort(key=lambda x: abs(
                        datetime.fromisoformat(x["datetime"][:10] if "T" in x["datetime"] else x["datetime"]) - target_date
                    ))
                    break

            if not images:
                print("No images found after all search strategies")
                return None

            # Use the best image (closest to target date with acceptable cloud cover)
            best_image = images[0]
            actual_cloud_cover = best_image["cloud_cover"]
            print(f"Selected image with {actual_cloud_cover:.1f}% cloud cover")

            # Get the actual date from the selected image
            dt_str = best_image["datetime"]
            if "T" in dt_str:
                actual_date = dt_str.split("T")[0]
            else:
                actual_date = dt_str[:10]

            # Calculate image size based on NATIVE resolution
            # This gives us the true pixel count for Sentinel-2 at 10m/pixel
            size = bbox_to_dimensions(bbox, resolution=resolution)

            # Store original native size for reference
            native_size = size
            print(f"Native resolution size: {native_size} pixels at {resolution}m/pixel")

            # Limit size to prevent huge downloads (for very large areas)
            max_pixels = 2500
            if size[0] > max_pixels or size[1] > max_pixels:
                scale = max_pixels / max(size[0], size[1])
                size = (int(size[0] * scale), int(size[1] * scale))
                print(f"Downscaled to {size} to prevent large downloads")

            # Create request for all bands using the specific date range
            actual_start = (datetime.strptime(actual_date, "%Y-%m-%d") - timedelta(days=1)).strftime("%Y-%m-%d")
            actual_end = (datetime.strptime(actual_date, "%Y-%m-%d") + timedelta(days=1)).strftime("%Y-%m-%d")

            request = SentinelHubRequest(
                evalscript=cls.get_evalscript_all_bands(),
                input_data=[
                    SentinelHubRequest.input_data(
                        data_collection=cls.get_data_collection(),
                        time_interval=(actual_start, actual_end),
                        maxcc=actual_cloud_cover / 100 + 0.05,  # Allow slightly more than found
                        mosaicking_order="leastCC",
                    )
                ],
                responses=[
                    SentinelHubRequest.output_response("default", MimeType.TIFF)
                ],
                bbox=bbox,
                size=size,
                config=config,
            )

            # Download image
            data = request.get_data()[0]

            if data is None or data.size == 0:
                print("No data returned from Sentinel Hub")
                return None

            # Use the actual date and cloud cover from selected image
            image_date = actual_date
            cloud_cover = actual_cloud_cover

            # Save as GeoTIFF
            output_dir = output_dir or getattr(settings, "UPLOAD_DIR", "/tmp/hackathon_uploads")
            Path(output_dir).mkdir(parents=True, exist_ok=True)

            image_id = str(uuid.uuid4())
            filepath = Path(output_dir) / f"{image_id}.tif"

            # Create transform from bounds
            transform = from_bounds(min_lon, min_lat, max_lon, max_lat, size[0], size[1])

            # Write GeoTIFF
            with rasterio.open(
                filepath,
                "w",
                driver="GTiff",
                height=data.shape[0],
                width=data.shape[1],
                count=data.shape[2] if len(data.shape) > 2 else 1,
                dtype=data.dtype,
                crs="EPSG:4326",
                transform=transform,
            ) as dst:
                if len(data.shape) > 2:
                    for i in range(data.shape[2]):
                        dst.write(data[:, :, i], i + 1)
                    # Add band descriptions
                    dst.descriptions = ("B04-Red", "B03-Green", "B02-Blue", "B08-NIR", "B11-SWIR1", "B12-SWIR2", "SCL")
                else:
                    dst.write(data, 1)

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
                "original_bounds": {
                    "min_lon": min_lon,
                    "min_lat": min_lat,
                    "max_lon": max_lon,
                    "max_lat": max_lat,
                },
                "crs": "EPSG:4326",
                "width": size[0],
                "height": size[1],
                "scale": resolution,
                "satellite": "Sentinel-2",
                "cloud_cover": cloud_cover,
                "source": "SentinelHub",
            }

        except Exception as e:
            print(f"Error downloading from Sentinel Hub: {e}")
            import traceback
            traceback.print_exc()
            return None

    @classmethod
    async def download_true_color(
        cls,
        bounds: tuple[float, float, float, float],
        date_start: str,
        date_end: str,
        output_dir: Optional[str] = None,
        resolution: int = 10,
        cloud_cover_max: int = 10,  # Maximum 10% cloud cover
    ) -> Optional[str]:
        """
        Download a true color PNG image (for preview).

        Returns:
            Path to the PNG file, or None if failed
        """
        try:
            config = cls.get_config()

            min_lon, min_lat, max_lon, max_lat = bounds
            bbox = BBox(bbox=[min_lon, min_lat, max_lon, max_lat], crs=CRS.WGS84)

            # Calculate image size based on NATIVE resolution
            size = bbox_to_dimensions(bbox, resolution=resolution)
            print(f"True color native resolution: {size} pixels")

            # Limit size for very large areas
            max_pixels = 2500
            if size[0] > max_pixels or size[1] > max_pixels:
                scale = max_pixels / max(size[0], size[1])
                size = (int(size[0] * scale), int(size[1] * scale))

            request = SentinelHubRequest(
                evalscript=cls.get_evalscript_true_color(),
                input_data=[
                    SentinelHubRequest.input_data(
                        data_collection=cls.get_data_collection(),
                        time_interval=(date_start, date_end),
                        maxcc=cloud_cover_max / 100,
                        mosaicking_order="leastCC",
                    )
                ],
                responses=[
                    SentinelHubRequest.output_response("default", MimeType.PNG)
                ],
                bbox=bbox,
                size=size,
                config=config,
            )

            data = request.get_data()[0]

            if data is None:
                return None

            output_dir = output_dir or getattr(settings, "UPLOAD_DIR", "/tmp/hackathon_uploads")
            Path(output_dir).mkdir(parents=True, exist_ok=True)

            image_id = str(uuid.uuid4())
            filepath = Path(output_dir) / f"{image_id}_preview.png"

            from PIL import Image
            img = Image.fromarray(data)
            img.save(filepath)

            return str(filepath)

        except Exception as e:
            print(f"Error downloading true color from Sentinel Hub: {e}")
            return None

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
        before_image = await cls.download_image(
            bounds, before_start, before_end, output_dir
        )

        if before_image is None:
            print("Failed to download 'before' image from Sentinel Hub")
            return None

        # Download after image
        after_start = (date_after_dt - delta).strftime("%Y-%m-%d")
        after_end = (date_after_dt + delta).strftime("%Y-%m-%d")
        after_image = await cls.download_image(
            bounds, after_start, after_end, output_dir
        )

        if after_image is None:
            print("Failed to download 'after' image from Sentinel Hub")
            return None

        return {
            "before": before_image,
            "after": after_image,
        }
