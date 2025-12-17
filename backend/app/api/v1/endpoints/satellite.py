"""
Satellite image download endpoints.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field

from app.api.v1.endpoints.images import images_db
from app.core.satellite import EarthEngineService
from app.core.satellite.mock_satellite import MockSatelliteService

router = APIRouter()

# Flag to use mock service (set to True for demo without GEE auth)
USE_MOCK = True  # Change to False when Earth Engine is authenticated


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


# Task storage
download_tasks: dict[str, dict] = {}


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

        # Use mock service for demo or real Earth Engine when authenticated
        if USE_MOCK:
            download_tasks[task_id]["message"] = "Gerando imagens de demonstração..."
            result = await MockSatelliteService.download_image_pair(
                bounds=bounds,
                date_before=request.date_before,
                date_after=request.date_after,
                date_range_days=request.date_range_days,
            )
        else:
            download_tasks[task_id]["message"] = "Baixando imagens do Sentinel-2..."
            result = await EarthEngineService.download_image_pair(
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

        # Calculate totals
        total_area = sum(c.get("properties", {}).get("area", 0) for c in changes)

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
