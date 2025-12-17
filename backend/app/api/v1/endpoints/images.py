"""Image upload and management endpoints."""

import tempfile
from pathlib import Path

import aiofiles
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.db.session import get_db
from app.models.satellite_image import SatelliteImage
from app.schemas.image import ImageListResponse, ImageResponse, ImageUploadResponse
from app.services.storage_service import get_image_path, upload_file

router = APIRouter()

# In-memory storage for satellite images (used by satellite endpoint)
images_db: dict[str, dict] = {}

ALLOWED_EXTENSIONS = {".tif", ".tiff", ".png", ".jpg", ".jpeg"}
ALLOWED_CONTENT_TYPES = {
    "image/tiff",
    "image/png",
    "image/jpeg",
    "image/geotiff",
    "application/octet-stream",
}


@router.post("/upload", response_model=ImageUploadResponse)
async def upload_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload a satellite image."""
    # Validate file extension
    if file.filename:
        ext = Path(file.filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo de arquivo não suportado. Use: {', '.join(ALLOWED_EXTENSIONS)}",
            )

    # Read file content
    content = await file.read()
    file_size = len(content)

    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Arquivo muito grande. Máximo: {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB",
        )

    # Create database record first to get ID
    image = SatelliteImage(
        name=file.filename or "unnamed",
        original_filename=file.filename or "unnamed",
        storage_path="",  # Will be updated after upload
        file_size=file_size,
        status="pending",
    )
    db.add(image)
    db.commit()
    db.refresh(image)

    try:
        # Save to temp file and upload to MinIO
        ext = Path(file.filename or "image.tif").suffix or ".tif"
        storage_path = get_image_path(str(image.id), f"original{ext}")

        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_file:
            temp_file.write(content)
            temp_path = temp_file.name

        try:
            upload_file(temp_path, storage_path)
            image.storage_path = storage_path
            image.status = "ready"

            # Try to extract image dimensions
            try:
                from PIL import Image

                with Image.open(temp_path) as img:
                    image.width = img.width
                    image.height = img.height
            except Exception:
                pass

            db.commit()
        finally:
            Path(temp_path).unlink(missing_ok=True)

    except Exception as e:
        image.status = "error"
        image.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Erro ao salvar arquivo: {e}")

    return ImageUploadResponse(
        id=image.id,
        filename=image.original_filename,
        message="Upload realizado com sucesso",
    )


@router.get("/{image_id}", response_model=ImageResponse)
async def get_image(image_id: int, db: Session = Depends(get_db)):
    """Get image details."""
    image = db.query(SatelliteImage).filter(SatelliteImage.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Imagem não encontrada")
    return image


@router.get("/", response_model=list[ImageListResponse])
async def list_images(db: Session = Depends(get_db)):
    """List all uploaded images."""
    images = db.query(SatelliteImage).order_by(SatelliteImage.created_at.desc()).all()
    return images


@router.delete("/{image_id}")
async def delete_image(image_id: int, db: Session = Depends(get_db)):
    """Delete an image."""
    image = db.query(SatelliteImage).filter(SatelliteImage.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Imagem não encontrada")

    # Delete from storage
    try:
        from app.services.storage_service import delete_file

        delete_file(image.storage_path)
    except Exception:
        pass  # Continue even if storage deletion fails

    db.delete(image)
    db.commit()

    return {"message": "Imagem excluída com sucesso"}
