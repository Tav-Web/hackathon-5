"""
Satellite image download endpoints.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field

from app.config import settings
from app.core.satellite import EarthEngineService, SentinelHubService

router = APIRouter()


def get_satellite_service():
    """Get the configured satellite service."""
    source = getattr(settings, "SATELLITE_SOURCE", "earth_engine")
    if source == "sentinel_hub":
        return SentinelHubService
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

        # Download from configured satellite service
        SatelliteService = get_satellite_service()
        source_name = "Sentinel Hub" if SatelliteService == SentinelHubService else "Earth Engine"
        download_tasks[task_id]["message"] = f"Baixando imagens do Sentinel-2 via {source_name}..."

        result = await SatelliteService.download_image_pair(
            bounds=bounds,
            date_before=request.date_before,
            date_after=request.date_after,
            date_range_days=request.date_range_days,
        )

        if result is None:
            download_tasks[task_id]["status"] = "failed"
            download_tasks[task_id]["message"] = "Nenhuma imagem encontrada para o período/região"
            return

        # Register images in the images_db
        before_info = result["before"]
        after_info = result["after"]

        images_db[before_info["id"]] = {
            "id": before_info["id"],
            "filename": f"sentinel2_{before_info['date']}_before.tif",
            "filepath": before_info["filepath"],
            "width": before_info["width"],
            "height": before_info["height"],
            "bounds": before_info["bounds"],
            "crs": before_info["crs"],
            "capture_date": before_info["date"],
            "created_at": datetime.utcnow(),
            "satellite": before_info["satellite"],
            "cloud_cover": before_info["cloud_cover"],
        }

        images_db[after_info["id"]] = {
            "id": after_info["id"],
            "filename": f"sentinel2_{after_info['date']}_after.tif",
            "filepath": after_info["filepath"],
            "width": after_info["width"],
            "height": after_info["height"],
            "bounds": after_info["bounds"],
            "crs": after_info["crs"],
            "capture_date": after_info["date"],
            "created_at": datetime.utcnow(),
            "satellite": after_info["satellite"],
            "cloud_cover": after_info["cloud_cover"],
        }

        download_tasks[task_id].update({
            "status": "completed",
            "message": "Download concluído",
            "before_id": before_info["id"],
            "after_id": after_info["id"],
            "before_date": before_info["date"],
            "after_date": after_info["date"],
        })

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

        return SatelliteAnalyzeResponse(
            id=str(uuid_module.uuid4()),
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
    from PIL import Image, ImageEnhance
    from fastapi.responses import StreamingResponse

    if image_id not in images_db:
        raise HTTPException(status_code=404, detail=f"Imagem não encontrada: {image_id}")

    image_info = images_db[image_id]
    filepath = image_info.get("filepath")

    if not filepath:
        raise HTTPException(status_code=404, detail="Arquivo de imagem não encontrado")

    try:
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
