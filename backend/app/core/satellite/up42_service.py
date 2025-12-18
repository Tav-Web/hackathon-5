"""
UP42 integration for high-resolution satellite imagery.
UP42 is an aggregator providing access to multiple providers (Maxar, Airbus, etc.)
Resolution: 30cm - 1m (depending on provider)
https://up42.com/
"""
import io
import os
import uuid
import httpx
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from PIL import Image

from app.config import settings


def crop_quicklook_to_bounds(
    quicklook_bytes: bytes,
    image_geometry: dict,
    user_bounds: tuple[float, float, float, float],
    padding_percent: float = 0.1,
) -> bytes:
    """
    Crop a quicklook image to show approximately the user's selected area.

    Args:
        quicklook_bytes: Raw PNG/JPG bytes of the quicklook
        image_geometry: GeoJSON geometry of the full satellite scene
        user_bounds: (min_lon, min_lat, max_lon, max_lat) user's selection
        padding_percent: Extra padding around the crop (0.1 = 10%)

    Returns:
        Cropped image as PNG bytes
    """
    try:
        # Load the quicklook image
        img = Image.open(io.BytesIO(quicklook_bytes))
        img_width, img_height = img.size

        # Extract image bounds from geometry
        if image_geometry and image_geometry.get("type") == "Polygon":
            coords = image_geometry["coordinates"][0]
            img_lons = [c[0] for c in coords]
            img_lats = [c[1] for c in coords]
            img_min_lon, img_max_lon = min(img_lons), max(img_lons)
            img_min_lat, img_max_lat = min(img_lats), max(img_lats)
        else:
            # Can't crop without geometry
            return quicklook_bytes

        user_min_lon, user_min_lat, user_max_lon, user_max_lat = user_bounds

        # Calculate the geo extent of the image
        img_lon_range = img_max_lon - img_min_lon
        img_lat_range = img_max_lat - img_min_lat

        if img_lon_range <= 0 or img_lat_range <= 0:
            return quicklook_bytes

        # Map user bounds to pixel coordinates
        # Note: Image Y increases downward, but lat increases upward
        def lon_to_px(lon):
            return int((lon - img_min_lon) / img_lon_range * img_width)

        def lat_to_px(lat):
            # Invert Y axis
            return int((img_max_lat - lat) / img_lat_range * img_height)

        # Calculate crop box in pixels
        crop_left = lon_to_px(user_min_lon)
        crop_right = lon_to_px(user_max_lon)
        crop_top = lat_to_px(user_max_lat)
        crop_bottom = lat_to_px(user_min_lat)

        # Add padding
        crop_width = crop_right - crop_left
        crop_height = crop_bottom - crop_top
        pad_x = int(crop_width * padding_percent)
        pad_y = int(crop_height * padding_percent)

        crop_left = max(0, crop_left - pad_x)
        crop_right = min(img_width, crop_right + pad_x)
        crop_top = max(0, crop_top - pad_y)
        crop_bottom = min(img_height, crop_bottom + pad_y)

        # Ensure valid crop box
        if crop_left >= crop_right or crop_top >= crop_bottom:
            print(f"Invalid crop box: ({crop_left}, {crop_top}, {crop_right}, {crop_bottom})")
            return quicklook_bytes

        # Check if user bounds are within image bounds
        if (user_max_lon < img_min_lon or user_min_lon > img_max_lon or
            user_max_lat < img_min_lat or user_min_lat > img_max_lat):
            print("User bounds outside image bounds, returning full quicklook")
            return quicklook_bytes

        # Crop the image
        cropped = img.crop((crop_left, crop_top, crop_right, crop_bottom))

        # Save to bytes
        buffer = io.BytesIO()
        cropped.save(buffer, format="PNG")
        buffer.seek(0)

        print(f"Cropped quicklook from {img_width}x{img_height} to {cropped.width}x{cropped.height}")
        return buffer.getvalue()

    except Exception as e:
        print(f"Error cropping quicklook: {e}")
        return quicklook_bytes


class UP42Service:
    """Service for accessing satellite images via UP42 platform."""

    _token = None
    _token_expires = None
    AUTH_URL = "https://auth.up42.com/realms/public/protocol/openid-connect/token"
    BASE_URL = "https://api.up42.com"

    # Available hosts for catalog search
    # Each host provides different satellite data:
    # - oneatlas: Airbus (Pléiades, SPOT)
    # - planet: Planet Labs (PlanetScope, SkySat)
    # - maxar: Maxar (WorldView, GeoEye)
    AVAILABLE_HOSTS = ["oneatlas", "planet", "maxar"]

    @classmethod
    def get_credentials(cls) -> tuple[str, str]:
        """Get UP42 credentials from environment (email and password)."""
        username = os.getenv("UP42_USERNAME") or getattr(
            settings, "UP42_USERNAME", None
        )
        password = os.getenv("UP42_PASSWORD") or getattr(
            settings, "UP42_PASSWORD", None
        )
        return username, password

    @classmethod
    def is_available(cls) -> bool:
        """Check if UP42 service is available (credentials configured)."""
        username, password = cls.get_credentials()
        return bool(username and password)

    @classmethod
    async def get_token(cls) -> str:
        """Get or refresh UP42 access token using password grant."""
        # Check if we have a valid token
        if cls._token and cls._token_expires:
            if datetime.now() < cls._token_expires:
                return cls._token

        username, password = cls.get_credentials()
        if not username or not password:
            raise ValueError(
                "UP42 credentials not configured. "
                "Set UP42_USERNAME and UP42_PASSWORD in .env"
            )

        async with httpx.AsyncClient() as client:
            response = await client.post(
                cls.AUTH_URL,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                data={
                    "username": username,
                    "password": password,
                    "grant_type": "password",
                    "client_id": "up42-api",
                },
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()

        cls._token = data["access_token"]
        # Token expires in 5 min (300s), refresh 1 min before
        cls._token_expires = datetime.now() + timedelta(seconds=data.get("expires_in", 300) - 60)

        print(f"UP42 token obtained, expires at {cls._token_expires}")
        return cls._token

    @classmethod
    async def search_catalog(
        cls,
        bounds: tuple[float, float, float, float],
        date_start: str,
        date_end: str,
        hosts: list[str] = None,
        cloud_cover_max: int = 20,
        limit: int = 10,
    ) -> list[dict]:
        """
        Search UP42 catalog for available images using host-based API.

        Args:
            bounds: (min_lon, min_lat, max_lon, max_lat)
            date_start: Start date (YYYY-MM-DD)
            date_end: End date (YYYY-MM-DD)
            hosts: List of hosts to search (e.g., ["oneatlas", "planet", "maxar"])
            cloud_cover_max: Maximum cloud cover percentage
            limit: Maximum results to return

        Returns:
            List of available images with metadata
        """
        token = await cls.get_token()

        min_lon, min_lat, max_lon, max_lat = bounds

        # Default hosts to search
        if hosts is None:
            hosts = cls.AVAILABLE_HOSTS

        # Create GeoJSON geometry
        geometry = {
            "type": "Polygon",
            "coordinates": [[
                [min_lon, min_lat],
                [max_lon, min_lat],
                [max_lon, max_lat],
                [min_lon, max_lat],
                [min_lon, min_lat],
            ]]
        }

        search_body = {
            "datetime": f"{date_start}T00:00:00Z/{date_end}T23:59:59Z",
            "intersects": geometry,
            "query": {
                "cloudCoverage": {"lte": cloud_cover_max}
            },
            "limit": limit,
        }

        results = []
        async with httpx.AsyncClient() as client:
            for host in hosts:
                try:
                    response = await client.post(
                        f"{cls.BASE_URL}/catalog/hosts/{host}/stac/search",
                        headers={"Authorization": f"Bearer {token}"},
                        json=search_body,
                        timeout=30.0,
                    )

                    if response.status_code == 200:
                        data = response.json()
                        for feature in data.get("features", []):
                            props = feature.get("properties", {})
                            collection = props.get("collection", host)
                            # ID can be in feature.id or properties.id
                            image_id = feature.get("id") or props.get("id")
                            results.append({
                                "id": image_id,
                                "host": host,
                                "collection": collection,
                                "datetime": props.get("datetime", props.get("acquisitionDate")),
                                "cloud_cover": props.get("cloudCoverage", props.get("cloudCover", 0)),
                                "resolution": props.get("resolution", cls._get_resolution(collection)),
                                "geometry": feature.get("geometry"),
                                "properties": props,
                            })
                    else:
                        print(f"UP42 host {host} returned {response.status_code}: {response.text[:200]}")
                except Exception as e:
                    print(f"Error searching UP42 host {host}: {e}")
                    continue

        # Sort by cloud cover
        results.sort(key=lambda x: x.get("cloud_cover", 100))
        return results[:limit]

    @classmethod
    def _get_resolution(cls, collection: str) -> float:
        """Get typical resolution for a collection."""
        resolutions = {
            # Airbus (oneatlas)
            "pneo": 0.3,    # Pléiades Neo
            "phr": 0.5,     # Pléiades
            "spot": 1.5,    # SPOT
            # Planet
            "psscene": 3.0,      # PlanetScope
            "skysat": 0.5,       # SkySat
            # Maxar
            "worldview": 0.3,    # WorldView
            "geoeye": 0.4,       # GeoEye
            # Generic
            "sentinel-2": 10.0,
        }
        # Check if collection name contains any known key
        collection_lower = collection.lower()
        for key, res in resolutions.items():
            if key in collection_lower:
                return res
        return 1.0  # Default

    @classmethod
    async def get_quicklook(
        cls,
        image_id: str,
        host: str,
    ) -> Optional[bytes]:
        """
        Get quicklook/preview image.

        Args:
            image_id: Image ID from search
            host: Host name (e.g., "oneatlas")

        Returns:
            Image bytes or None
        """
        token = await cls.get_token()

        # Correct endpoint: /catalog/{host}/image/{image_id}/quicklook
        url = f"{cls.BASE_URL}/catalog/{host}/image/{image_id}/quicklook"

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    url,
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=60.0,  # Quicklooks can be large
                )

                if response.status_code == 200:
                    content_type = response.headers.get("content-type", "")
                    if "image" in content_type:
                        print(f"Got quicklook from UP42: {len(response.content)} bytes")
                        return response.content
                    else:
                        print(f"UP42 quicklook returned non-image: {content_type}")
                else:
                    print(f"UP42 quicklook failed: {response.status_code} - {response.text[:200]}")
            except Exception as e:
                print(f"Error getting quicklook from UP42: {e}")

        return None

    @classmethod
    async def search_closest_image(
        cls,
        bounds: tuple[float, float, float, float],
        target_date: str,
        max_days_range: int = 60,
        cloud_cover_max: int = 30,
        hosts: list[str] = None,
    ) -> Optional[dict]:
        """
        Search for the image closest to a target date.

        Args:
            bounds: (min_lon, min_lat, max_lon, max_lat)
            target_date: Target date (YYYY-MM-DD)
            max_days_range: Maximum days to search before/after target
            cloud_cover_max: Maximum cloud cover percentage
            hosts: List of hosts to search

        Returns:
            Best matching image
        """
        target_dt = datetime.fromisoformat(target_date)
        date_start = (target_dt - timedelta(days=max_days_range)).strftime("%Y-%m-%d")
        date_end = (target_dt + timedelta(days=max_days_range)).strftime("%Y-%m-%d")

        results = await cls.search_catalog(
            bounds, date_start, date_end,
            hosts=hosts,
            cloud_cover_max=cloud_cover_max,
            limit=50,
        )

        if not results:
            print(f"No UP42 images found within {max_days_range} days of {target_date}")
            return None

        # Calculate days from target for each result
        for result in results:
            dt_str = result.get("datetime", "")
            if dt_str:
                if "T" in dt_str:
                    img_date = datetime.fromisoformat(dt_str.replace("Z", "+00:00")).replace(tzinfo=None)
                else:
                    img_date = datetime.fromisoformat(dt_str[:10])
                result["days_from_target"] = abs((img_date - target_dt).days)
            else:
                result["days_from_target"] = 999

        # Sort by days from target, then cloud cover
        results.sort(key=lambda x: (x["days_from_target"], x.get("cloud_cover", 100)))

        best = results[0]
        print(f"Found UP42 image {best['id']} ({best['host']}/{best['collection']}) - {best['days_from_target']} days from target, {best.get('cloud_cover', 0):.1f}% clouds, {best.get('resolution', 'N/A')}m resolution")

        return best

    @classmethod
    async def download_quicklook_pair(
        cls,
        bounds: tuple[float, float, float, float],
        date_before: str,
        date_after: str,
        output_dir: Optional[str] = None,
        max_days_range: int = 60,
    ) -> Optional[dict]:
        """
        Download quicklook previews for before/after comparison.
        Note: Full downloads require credits on UP42.

        Args:
            bounds: Bounding box
            date_before: Target date for "before" image
            date_after: Target date for "after" image
            max_days_range: Maximum days to search
            output_dir: Directory to save images

        Returns:
            dict with before and after image info
        """
        output_dir = output_dir or getattr(settings, "UPLOAD_DIR", "/tmp/hackathon_uploads")
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        min_lon, min_lat, max_lon, max_lat = bounds

        # Search for before image
        print(f"Searching UP42 image closest to 'before' date: {date_before}")
        before_result = await cls.search_closest_image(
            bounds, date_before, max_days_range
        )

        if not before_result:
            return None

        # Download quicklook
        before_quicklook = await cls.get_quicklook(
            before_result["id"], before_result["host"]
        )

        before_image = None
        if before_quicklook:
            before_path = Path(output_dir) / f"up42_before_{uuid.uuid4()}.png"
            before_path.write_bytes(before_quicklook)

            before_image = {
                "id": str(uuid.uuid4()),
                "filepath": str(before_path),
                "date": before_result.get("datetime", date_before)[:10],
                "days_from_target": before_result.get("days_from_target", 0),
                "bounds": {"min_lon": min_lon, "min_lat": min_lat, "max_lon": max_lon, "max_lat": max_lat},
                "resolution": before_result.get("resolution", 1.0),
                "collection": before_result.get("collection"),
                "host": before_result.get("host"),
                "cloud_cover": before_result.get("cloud_cover", 0),
                "source": "UP42",
                "up42_id": before_result["id"],
            }
        else:
            # If no quicklook available, still return the metadata
            before_image = {
                "id": str(uuid.uuid4()),
                "filepath": None,
                "date": before_result.get("datetime", date_before)[:10],
                "days_from_target": before_result.get("days_from_target", 0),
                "bounds": {"min_lon": min_lon, "min_lat": min_lat, "max_lon": max_lon, "max_lat": max_lat},
                "resolution": before_result.get("resolution", 1.0),
                "collection": before_result.get("collection"),
                "host": before_result.get("host"),
                "cloud_cover": before_result.get("cloud_cover", 0),
                "source": "UP42",
                "up42_id": before_result["id"],
                "note": "Quicklook not available - order required for full image"
            }

        # Search for after image
        print(f"Searching UP42 image closest to 'after' date: {date_after}")
        after_result = await cls.search_closest_image(
            bounds, date_after, max_days_range
        )

        if not after_result:
            return {"before": before_image, "after": None} if before_image else None

        # Download quicklook
        after_quicklook = await cls.get_quicklook(
            after_result["id"], after_result["host"]
        )

        after_image = None
        if after_quicklook:
            after_path = Path(output_dir) / f"up42_after_{uuid.uuid4()}.png"
            after_path.write_bytes(after_quicklook)

            after_image = {
                "id": str(uuid.uuid4()),
                "filepath": str(after_path),
                "date": after_result.get("datetime", date_after)[:10],
                "days_from_target": after_result.get("days_from_target", 0),
                "bounds": {"min_lon": min_lon, "min_lat": min_lat, "max_lon": max_lon, "max_lat": max_lat},
                "resolution": after_result.get("resolution", 1.0),
                "collection": after_result.get("collection"),
                "host": after_result.get("host"),
                "cloud_cover": after_result.get("cloud_cover", 0),
                "source": "UP42",
                "up42_id": after_result["id"],
            }
        else:
            # If no quicklook available, still return the metadata
            after_image = {
                "id": str(uuid.uuid4()),
                "filepath": None,
                "date": after_result.get("datetime", date_after)[:10],
                "days_from_target": after_result.get("days_from_target", 0),
                "bounds": {"min_lon": min_lon, "min_lat": min_lat, "max_lon": max_lon, "max_lat": max_lat},
                "resolution": after_result.get("resolution", 1.0),
                "collection": after_result.get("collection"),
                "host": after_result.get("host"),
                "cloud_cover": after_result.get("cloud_cover", 0),
                "source": "UP42",
                "up42_id": after_result["id"],
                "note": "Quicklook not available - order required for full image"
            }

        if before_image and after_image:
            return {"before": before_image, "after": after_image}
        elif before_image:
            return {"before": before_image, "after": None}
        else:
            return None

    @classmethod
    async def get_available_hosts(cls) -> list[dict]:
        """Get list of available hosts/data providers."""
        # Test which hosts are accessible
        token = await cls.get_token()
        available = []

        async with httpx.AsyncClient() as client:
            for host in cls.AVAILABLE_HOSTS:
                try:
                    response = await client.post(
                        f"{cls.BASE_URL}/catalog/hosts/{host}/stac/search",
                        headers={"Authorization": f"Bearer {token}"},
                        json={"limit": 1},
                        timeout=10.0,
                    )
                    if response.status_code == 200:
                        available.append({
                            "id": host,
                            "name": cls._get_host_name(host),
                            "description": cls._get_host_description(host),
                        })
                except Exception:
                    continue

        return available

    @classmethod
    def _get_host_name(cls, host: str) -> str:
        """Get friendly name for a host."""
        names = {
            "oneatlas": "Airbus OneAtlas",
            "planet": "Planet Labs",
            "maxar": "Maxar Technologies",
        }
        return names.get(host, host.title())

    @classmethod
    def _get_host_description(cls, host: str) -> str:
        """Get description for a host."""
        descriptions = {
            "oneatlas": "Pléiades (50cm), Pléiades Neo (30cm), SPOT (1.5m)",
            "planet": "PlanetScope (3m), SkySat (50cm)",
            "maxar": "WorldView (30cm), GeoEye (40cm)",
        }
        return descriptions.get(host, "Satellite imagery provider")
