"""
Satellite image download endpoints.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field

from app.config import settings
from app.core.satellite import (
    EarthEngineService,
    SentinelHubService,
    PlanetService,
    NICFIService,
)

router = APIRouter()


def get_satellite_service(source: str = "earth_engine"):
    """Get the satellite service based on source parameter."""
    if source == "nicfi":
        if not NICFIService.is_available():
            raise ValueError("Planet API key not configured for NICFI. Set PLANET_API_KEY in .env")
        return NICFIService
    elif source == "planet":
        if not PlanetService.is_available():
            raise ValueError("Planet API key not configured. Set PLANET_API_KEY in .env")
        return PlanetService
    elif source == "sentinel":
        # Check if Sentinel Hub has credentials configured
        if not SentinelHubService.is_available():
            print("Sentinel Hub credentials not configured, falling back to Earth Engine")
            return EarthEngineService
        return SentinelHubService
    else:
        # earth_engine (default) - always available with GEE credentials
        return EarthEngineService


class BoundsModel(BaseModel):
    """Geographic bounds."""
    min_lon: float = Field(..., ge=-180, le=180)
    min_lat: float = Field(..., ge=-90, le=90)
    max_lon: float = Field(..., ge=-180, le=180)
    max_lat: float = Field(..., ge=-90, le=90)


class SatelliteDownloadRequest(BaseModel):
    """Request to download satellite images."""
    bounds: BoundsModel
    date_before: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    date_after: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    date_range_days: int = Field(default=30, ge=1, le=90)
    source: str = Field(default="earth_engine", pattern=r"^(earth_engine|sentinel|planet|nicfi)$")


class SatelliteImageInfo(BaseModel):
    """Information about a downloaded satellite image."""
    id: str
    filepath: str
    date: str
    bounds: BoundsModel
    crs: str
    width: int
    height: int
    scale: int
    satellite: str
    cloud_cover: float


class SatelliteDownloadResponse(BaseModel):
    """Response with downloaded image pair."""
    before: SatelliteImageInfo
    after: SatelliteImageInfo
    message: str


class SatelliteDownloadStatus(BaseModel):
    """Status of satellite download task."""
    task_id: str
    status: str  # pending, downloading, completed, failed
    message: Optional[str] = None
    before_id: Optional[str] = None
    after_id: Optional[str] = None
    before_date: Optional[str] = None
    after_date: Optional[str] = None


# Task storage
download_tasks: dict[str, dict] = {}

# Local storage for satellite images metadata (not using SQLAlchemy for demo simplicity)
images_db: dict[str, dict] = {}

# Local storage for satellite analysis results (for chat integration)
analyses_db: dict[str, dict] = {}


async def download_satellite_images_task(task_id: str, request: SatelliteDownloadRequest):
    """Background task to download satellite images."""
    try:
        download_tasks[task_id]["status"] = "downloading"

        bounds = (
            request.bounds.min_lon,
            request.bounds.min_lat,
            request.bounds.max_lon,
            request.bounds.max_lat,
        )

        # Download from requested satellite service
        try:
            SatelliteService = get_satellite_service(request.source)
        except ValueError as e:
            download_tasks[task_id]["status"] = "failed"
            download_tasks[task_id]["message"] = str(e)
            return

        # Set appropriate message based on source
        source_names = {
            "nicfi": "Planet NICFI (4.77m - florestas tropicais)",
            "planet": "Planet Labs (~3m resolution)",
            "sentinel": "Sentinel Hub (10m resolution)",
            "earth_engine": "Google Earth Engine (10m resolution)",
        }
        source_name = source_names.get(request.source, "Google Earth Engine (10m resolution)")
        download_tasks[task_id]["message"] = f"Baixando imagens via {source_name}..."

        # High-res providers may have limited coverage, use wider search range
        date_range = request.date_range_days
        if request.source == "planet":
            date_range = max(date_range, 90)  # At least 90 days for high-res providers
        elif request.source == "nicfi":
            date_range = max(date_range, 180)  # NICFI has monthly mosaics, need wider range

        result = await SatelliteService.download_image_pair(
            bounds=bounds,
            date_before=request.date_before,
            date_after=request.date_after,
            date_range_days=date_range,
        )

        if result is None:
            download_tasks[task_id]["status"] = "failed"
            error_messages = {
                "nicfi": (
                    "NICFI: Acesso nao habilitado. Cadastre-se em planet.com/nicfi "
                    "para obter acesso gratuito aos mosaicos de florestas tropicais."
                ),
                "planet": (
                    "Planet: Nenhuma imagem encontrada para o periodo/regiao. "
                    "Tente ajustar as datas ou a area selecionada."
                ),
            }
            download_tasks[task_id]["message"] = error_messages.get(
                request.source, "Nenhuma imagem encontrada para o período/região"
            )
            return

        # Register images in the images_db
        before_info = result["before"]
        after_info = result["after"]

        # Handle different response formats from different services
        def normalize_image_info(info, image_type: str):
            """Normalize image info from different satellite services."""
            source = info.get("source", request.source)
            return {
                "id": info["id"],
                "filename": f"{source}_{info['date']}_{image_type}.tif",
                "filepath": info.get("filepath"),
                "width": info.get("width", 512),
                "height": info.get("height", 512),
                "bounds": info.get("bounds", {}),
                "crs": info.get("crs", "EPSG:4326"),
                "capture_date": info.get("date"),
                "created_at": datetime.utcnow(),
                "satellite": info.get("satellite", info.get("collection", source)),
                "cloud_cover": info.get("cloud_cover", 0),
                "resolution": info.get("resolution"),
                "source": source,
                "note": info.get("note"),
            }

        # Handle cases where before or after might be None
        before_id = None
        after_id = None
        before_date = None
        after_date = None

        if before_info:
            images_db[before_info["id"]] = normalize_image_info(before_info, "before")
            before_id = before_info["id"]
            before_date = before_info.get("date")

        if after_info:
            images_db[after_info["id"]] = normalize_image_info(after_info, "after")
            after_id = after_info["id"]
            after_date = after_info.get("date")

        # Check if we have at least one image
        if not before_id and not after_id:
            download_tasks[task_id]["status"] = "failed"
            download_tasks[task_id]["message"] = "Nenhuma imagem encontrada para o período"
            return

        download_tasks[task_id].update({
            "status": "completed",
            "message": "Download concluído" if (before_id and after_id) else "Download parcial - apenas uma imagem encontrada",
            "before_id": before_id,
            "after_id": after_id,
            "before_date": before_date,
            "after_date": after_date,
        })

    except PermissionError as e:
        download_tasks[task_id]["status"] = "failed"
        download_tasks[task_id]["message"] = str(e)
    except Exception as e:
        download_tasks[task_id]["status"] = "failed"
        download_tasks[task_id]["message"] = str(e)


@router.post("/download", response_model=SatelliteDownloadStatus)
async def download_satellite_images(
    request: SatelliteDownloadRequest,
    background_tasks: BackgroundTasks,
):
    """
    Inicia o download de imagens de satélite para a região e datas especificadas.

    Retorna um task_id para acompanhar o progresso.
    """
    import uuid

    task_id = str(uuid.uuid4())
    download_tasks[task_id] = {
        "task_id": task_id,
        "status": "pending",
        "message": "Iniciando download...",
        "before_id": None,
        "after_id": None,
    }

    background_tasks.add_task(download_satellite_images_task, task_id, request)

    return SatelliteDownloadStatus(**download_tasks[task_id])


@router.get("/download/{task_id}", response_model=SatelliteDownloadStatus)
async def get_download_status(task_id: str):
    """Obtém o status do download de imagens de satélite."""
    if task_id not in download_tasks:
        raise HTTPException(status_code=404, detail="Task não encontrada")

    return SatelliteDownloadStatus(**download_tasks[task_id])


class SatelliteAnalyzeRequest(BaseModel):
    """Request to analyze satellite images."""
    image_before_id: str
    image_after_id: str
    threshold: float = Field(default=0.15, ge=0.01, le=1.0)
    min_area: int = Field(default=100, ge=1)


class SatelliteAnalyzeResponse(BaseModel):
    """Response from satellite image analysis."""
    id: str
    status: str
    total_changes: int
    total_area_changed: float
    changes: list[dict]


@router.post("/analyze", response_model=SatelliteAnalyzeResponse)
async def analyze_satellite_images(request: SatelliteAnalyzeRequest):
    """
    Analyze changes between two satellite images (using UUID string IDs).
    This endpoint is for satellite images stored in memory from /satellite/download.
    """
    import uuid as uuid_module
    from app.core.detection.change_detector import detect_changes

    # Get images from in-memory storage
    if request.image_before_id not in images_db:
        raise HTTPException(
            status_code=404,
            detail=f"Imagem 'antes' não encontrada: {request.image_before_id}"
        )
    if request.image_after_id not in images_db:
        raise HTTPException(
            status_code=404,
            detail=f"Imagem 'depois' não encontrada: {request.image_after_id}"
        )

    before_image = images_db[request.image_before_id]
    after_image = images_db[request.image_after_id]

    # Run change detection
    try:
        changes = await detect_changes(
            image_before_path=before_image["filepath"],
            image_after_path=after_image["filepath"],
            threshold=request.threshold,
            min_area=request.min_area,
        )

        # Filter changes to only include those within the original selected area
        # (images may be expanded for better quality, but we only want changes in user's selection)
        original_bounds = before_image.get("original_bounds") or after_image.get("original_bounds")
        if original_bounds:
            filtered_changes = []
            for change in changes:
                centroid = change.get("centroid", (0, 0))
                lon, lat = centroid
                # Check if centroid is within original bounds
                if (original_bounds["min_lon"] <= lon <= original_bounds["max_lon"] and
                    original_bounds["min_lat"] <= lat <= original_bounds["max_lat"]):
                    filtered_changes.append(change)
            changes = filtered_changes

        # Calculate totals - area is directly on the change object, not in properties
        total_area = sum(c.get("area", 0) for c in changes)

        # Generate a numeric ID for database compatibility
        # Use timestamp-based ID to ensure uniqueness and make it queryable
        import time
        analysis_id = int(time.time() * 1000) % 1000000000  # Numeric ID from timestamp

        # Store analysis results for chat integration
        analyses_db[str(analysis_id)] = {
            "id": analysis_id,
            "status": "completed",
            "total_changes": len(changes),
            "total_area_changed": total_area,
            "changes": changes,
            "image_before_id": request.image_before_id,
            "image_after_id": request.image_after_id,
            "threshold": request.threshold,
            "min_area": request.min_area,
            "created_at": datetime.utcnow().isoformat(),
        }

        return SatelliteAnalyzeResponse(
            id=str(analysis_id),
            status="completed",
            total_changes=len(changes),
            total_area_changed=total_area,
            changes=changes,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na análise: {str(e)}")


@router.get("/availability")
async def check_availability(
    min_lon: float,
    min_lat: float,
    max_lon: float,
    max_lat: float,
    date_start: str,
    date_end: str,
):
    """
    Verifica disponibilidade de imagens Sentinel-2 para uma região/período.
    """
    try:
        EarthEngineService.initialize()

        import ee
        bounds = (min_lon, min_lat, max_lon, max_lat)
        geometry = ee.Geometry.Rectangle([min_lon, min_lat, max_lon, max_lat])

        collection = (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterBounds(geometry)
            .filterDate(date_start, date_end)
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 30))
        )

        count = collection.size().getInfo()

        # Get dates of available images
        dates = []
        if count > 0:
            images = collection.toList(min(count, 10))
            for i in range(min(count, 10)):
                img = ee.Image(images.get(i))
                timestamp = img.get("system:time_start").getInfo()
                date = datetime.fromtimestamp(timestamp / 1000).strftime("%Y-%m-%d")
                cloud = img.get("CLOUDY_PIXEL_PERCENTAGE").getInfo()
                dates.append({"date": date, "cloud_cover": cloud})

        return {
            "available": count > 0,
            "count": count,
            "sample_dates": dates,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/image/{image_id}/preview")
async def get_image_preview(image_id: str, mode: str = "true_color"):
    """
    Get a PNG preview of a satellite image.

    Args:
        image_id: UUID of the image
        mode: Visualization mode - "true_color" (default), "false_color", or "ndvi"
    """
    import io
    import numpy as np
    import rasterio
    from PIL import Image, ImageEnhance, ImageDraw
    from fastapi.responses import StreamingResponse

    if image_id not in images_db:
        raise HTTPException(status_code=404, detail=f"Imagem não encontrada: {image_id}")

    image_info = images_db[image_id]
    filepath = image_info.get("filepath")

    # If no filepath, return a placeholder image with metadata
    if not filepath:
        # Create a placeholder image
        width, height = 800, 600
        img = Image.new('RGB', (width, height), color=(30, 41, 59))  # Dark slate
        draw = ImageDraw.Draw(img)

        # Draw text
        source = image_info.get("source", "unknown")
        satellite = image_info.get("satellite", "N/A")
        date = image_info.get("capture_date", "N/A")
        resolution = image_info.get("resolution", "N/A")
        note = image_info.get("note", "")

        lines = [
            f"Preview não disponível",
            "",
            f"Fonte: {source}",
            f"Satélite: {satellite}",
            f"Data: {date}",
            f"Resolução: {resolution}m" if resolution else "",
            "",
            note if note else "Imagem não encontrada",
        ]

        y = 150
        for line in lines:
            if line:
                # Center text
                bbox = draw.textbbox((0, 0), line)
                text_width = bbox[2] - bbox[0]
                x = (width - text_width) // 2
                color = (148, 163, 184) if "não disponível" not in line.lower() else (251, 191, 36)
                draw.text((x, y), line, fill=color)
            y += 30

        # Save to buffer
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)

        return StreamingResponse(
            buffer,
            media_type="image/png",
            headers={"Content-Disposition": f"inline; filename={image_id}_placeholder.png"}
        )

    try:
        # Check if file is a PNG/JPG - serve directly
        if filepath.lower().endswith('.png') or filepath.lower().endswith('.jpg') or filepath.lower().endswith('.jpeg'):
            # For preview images (PNG/JPG), just serve the file directly
            with open(filepath, 'rb') as f:
                img_data = f.read()

            # Optionally resize if too large
            img = Image.open(io.BytesIO(img_data))

            # If image is very large, resize for faster loading
            max_size = 1600
            if img.width > max_size or img.height > max_size:
                ratio = min(max_size / img.width, max_size / img.height)
                new_size = (int(img.width * ratio), int(img.height * ratio))
                img = img.resize(new_size, Image.LANCZOS)

            buffer = io.BytesIO()
            img.save(buffer, format="PNG")
            buffer.seek(0)

            return StreamingResponse(
                buffer,
                media_type="image/png",
                headers={"Content-Disposition": f"inline; filename={image_id}.png"}
            )

        # For GeoTIFF files (Earth Engine, Sentinel Hub), process with rasterio
        with rasterio.open(filepath) as src:
            # Sentinel-2 bands: B4 (Red), B3 (Green), B2 (Blue), B8 (NIR), B11 (SWIR1), B12 (SWIR2)

            def normalize_band(band, lower_percentile=1, upper_percentile=99, gamma=1.0):
                """Normalize band with percentile stretch and optional gamma correction."""
                min_val = np.percentile(band, lower_percentile)
                max_val = np.percentile(band, upper_percentile)
                normalized = np.clip((band - min_val) / (max_val - min_val + 1e-10), 0, 1)
                # Apply gamma correction for better visual contrast
                if gamma != 1.0:
                    normalized = np.power(normalized, 1/gamma)
                return (normalized * 255).astype(np.uint8)

            if src.count >= 4:
                # Read all needed bands
                red = src.read(1).astype(np.float32)    # B4
                green = src.read(2).astype(np.float32)  # B3
                blue = src.read(3).astype(np.float32)   # B2
                nir = src.read(4).astype(np.float32)    # B8

                if mode == "false_color":
                    # False color (NIR, Red, Green) - vegetation appears red
                    r = normalize_band(nir, gamma=1.2)
                    g = normalize_band(red, gamma=1.2)
                    b = normalize_band(green, gamma=1.2)
                elif mode == "ndvi":
                    # NDVI visualization with color map
                    with np.errstate(divide='ignore', invalid='ignore'):
                        ndvi = (nir - red) / (nir + red + 1e-10)
                        ndvi = np.nan_to_num(ndvi, nan=0.0)
                        ndvi = np.clip(ndvi, -1, 1)

                    # Color map: brown (-1) -> yellow (0) -> green (1)
                    r = np.zeros_like(ndvi, dtype=np.uint8)
                    g = np.zeros_like(ndvi, dtype=np.uint8)
                    b = np.zeros_like(ndvi, dtype=np.uint8)

                    # Negative NDVI (water, bare soil) - brown/red
                    mask_neg = ndvi < 0
                    r[mask_neg] = 139
                    g[mask_neg] = 69
                    b[mask_neg] = 19

                    # Low NDVI (0-0.2) - yellow/brown
                    mask_low = (ndvi >= 0) & (ndvi < 0.2)
                    r[mask_low] = 210
                    g[mask_low] = 180
                    b[mask_low] = 140

                    # Medium NDVI (0.2-0.5) - light green
                    mask_med = (ndvi >= 0.2) & (ndvi < 0.5)
                    intensity = ((ndvi[mask_med] - 0.2) / 0.3 * 155 + 100).astype(np.uint8)
                    r[mask_med] = 100
                    g[mask_med] = intensity
                    b[mask_med] = 50

                    # High NDVI (0.5+) - dark green
                    mask_high = ndvi >= 0.5
                    r[mask_high] = 34
                    g[mask_high] = 139
                    b[mask_high] = 34
                else:
                    # True color (Red, Green, Blue) - natural looking
                    # Apply stronger contrast and brightness for Sentinel-2
                    r = normalize_band(red, lower_percentile=2, upper_percentile=98, gamma=1.3)
                    g = normalize_band(green, lower_percentile=2, upper_percentile=98, gamma=1.3)
                    b = normalize_band(blue, lower_percentile=2, upper_percentile=98, gamma=1.3)

            elif src.count >= 3:
                # RGB image
                red = src.read(1).astype(np.float32)
                green = src.read(2).astype(np.float32)
                blue = src.read(3).astype(np.float32)

                r = normalize_band(red, gamma=1.2)
                g = normalize_band(green, gamma=1.2)
                b = normalize_band(blue, gamma=1.2)
            else:
                # Single band - grayscale
                band = src.read(1).astype(np.float32)
                gray = normalize_band(band, gamma=1.2)
                r = g = b = gray

            # Stack into RGB image
            rgb = np.stack([r, g, b], axis=-1)

            # Create PIL Image
            img = Image.fromarray(rgb)
            original_size = (img.width, img.height)
            print(f"Preview: Native resolution {original_size[0]}x{original_size[1]} pixels")

            # Enhance contrast and sharpness BEFORE upscaling for better quality
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(1.4)  # Stronger contrast for satellite imagery

            enhancer = ImageEnhance.Color(img)
            img = enhancer.enhance(1.2)  # Boost color saturation

            # For very small images (< 100px), apply Gaussian blur before upscaling
            # to reduce blocky appearance
            from PIL import ImageFilter
            if img.width < 100 or img.height < 100:
                # Apply slight blur to smooth out pixels before upscaling
                img = img.filter(ImageFilter.GaussianBlur(radius=0.5))
                print(f"Applied smoothing for small image")

            # Smart upscaling based on original size
            # For small images, use multi-step upscaling for better quality
            target_size = 1200
            if img.width < target_size or img.height < target_size:
                scale_factor = max(target_size / img.width, target_size / img.height)

                # For extreme upscaling (> 4x), do it in steps
                if scale_factor > 4:
                    # Step 1: 2x upscale with bicubic
                    intermediate_size = (img.width * 2, img.height * 2)
                    img = img.resize(intermediate_size, Image.Resampling.BICUBIC)
                    # Apply slight sharpening
                    enhancer = ImageEnhance.Sharpness(img)
                    img = enhancer.enhance(1.3)
                    # Recalculate scale factor
                    scale_factor = max(target_size / img.width, target_size / img.height)

                new_size = (int(img.width * scale_factor), int(img.height * scale_factor))
                img = img.resize(new_size, Image.Resampling.LANCZOS)
                print(f"Preview upscaled from {original_size} to {new_size}")

            # Final sharpening pass
            enhancer = ImageEnhance.Sharpness(img)
            img = enhancer.enhance(1.1)

            # Cap at max size to prevent huge files
            max_size = 2000
            if img.width > max_size or img.height > max_size:
                ratio = min(max_size / img.width, max_size / img.height)
                new_size = (int(img.width * ratio), int(img.height * ratio))
                img = img.resize(new_size, Image.Resampling.LANCZOS)

            # Save to buffer with high quality PNG
            buffer = io.BytesIO()
            img.save(buffer, format="PNG", compress_level=1)  # Low compression for quality
            buffer.seek(0)

            return StreamingResponse(
                buffer,
                media_type="image/png",
                headers={"Content-Disposition": f"inline; filename={image_id}.png"}
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar preview: {str(e)}")


@router.get("/sources")
async def get_available_sources():
    """
    Get list of available satellite sources and their status.
    Returns which sources are configured and ready to use.
    """
    # Check Planet API key
    planet_api_key = PlanetService.is_available()

    sources = [
        {
            "id": "earth_engine",
            "name": "Google Earth Engine",
            "resolution": "10m",
            "available": True,  # Always available with GEE credentials
            "description": "Sentinel-2 via Google Earth Engine (gratuito)",
            "coverage": "Global",
            "status": "ready",
        },
        {
            "id": "nicfi",
            "name": "Planet NICFI",
            "resolution": "4.77m",
            "available": planet_api_key,
            "description": "Mosaicos mensais gratuitos para florestas tropicais",
            "coverage": "Florestas tropicais (Amazonia, Congo, Sudeste Asiatico)",
            "coverage_info": NICFIService.get_coverage_info() if planet_api_key else None,
            "status": "requires_nicfi_signup" if planet_api_key else "no_api_key",
            "signup_url": "https://www.planet.com/nicfi/",
        },
        {
            "id": "sentinel",
            "name": "Sentinel Hub",
            "resolution": "10m",
            "available": SentinelHubService.is_available(),
            "description": "Acesso direto ao Sentinel Hub (requer API key)",
            "coverage": "Global",
            "status": "ready" if SentinelHubService.is_available() else "no_api_key",
        },
        {
            "id": "planet",
            "name": "Planet Labs",
            "resolution": "3m",
            "available": planet_api_key,
            "description": "PlanetScope - previews 512x512 (gratuito)",
            "coverage": "Global",
            "status": "ready" if planet_api_key else "no_api_key",
            "note": "Thumbnails disponiveis com conta trial/E&R",
        },
    ]

    return {
        "sources": sources,
        "available_count": sum(1 for s in sources if s["available"]),
    }


@router.get("/nicfi/coverage")
async def get_nicfi_coverage():
    """
    Get NICFI tropical forest coverage information.
    Returns the regions covered by the free NICFI program.
    """
    return NICFIService.get_coverage_info()


@router.get("/nicfi/check-coverage")
async def check_nicfi_coverage(
    min_lon: float,
    min_lat: float,
    max_lon: float,
    max_lat: float,
):
    """
    Check if a given area is within NICFI tropical coverage.
    """
    bounds = (min_lon, min_lat, max_lon, max_lat)
    is_covered, region_name, countries = NICFIService.check_tropical_coverage(bounds)

    return {
        "is_covered": is_covered,
        "region": region_name,
        "countries": countries,
        "message": (
            f"Area dentro da cobertura NICFI: {region_name}"
            if is_covered
            else "Area fora da cobertura NICFI. NICFI cobre apenas florestas tropicais."
        ),
    }
