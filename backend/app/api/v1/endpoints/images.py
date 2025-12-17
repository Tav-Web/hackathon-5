import uuid
from datetime import datetime
from pathlib import Path

import aiofiles
from fastapi import APIRouter, File, HTTPException, UploadFile

from app.config import settings
from app.schemas.image import ImageResponse, ImageUploadResponse

router = APIRouter()

# Armazenamento temporário em memória (em produção, usar banco de dados)
images_db: dict[str, dict] = {}


@router.post("/upload", response_model=ImageUploadResponse)
async def upload_image(file: UploadFile = File(...)):
    """Upload de imagem de satélite."""
    # Validar tipo de arquivo
    allowed_types = ["image/tiff", "image/png", "image/jpeg", "image/geotiff"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de arquivo não suportado. Use: {', '.join(allowed_types)}",
        )

    # Validar tamanho
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Arquivo muito grande. Máximo: {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB",
        )

    # Gerar ID e salvar arquivo
    image_id = str(uuid.uuid4())
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_ext = Path(file.filename or "image").suffix or ".tif"
    filepath = upload_dir / f"{image_id}{file_ext}"

    async with aiofiles.open(filepath, "wb") as f:
        await f.write(content)

    # Salvar metadados
    images_db[image_id] = {
        "id": image_id,
        "filename": file.filename,
        "filepath": str(filepath),
        "width": 0,  # TODO: extrair das imagens
        "height": 0,
        "bounds": None,
        "crs": None,
        "capture_date": None,
        "created_at": datetime.utcnow(),
    }

    return ImageUploadResponse(
        id=image_id,
        filename=file.filename or "unknown",
        message="Upload realizado com sucesso",
    )


@router.get("/{image_id}", response_model=ImageResponse)
async def get_image(image_id: str):
    """Obter informações de uma imagem."""
    if image_id not in images_db:
        raise HTTPException(status_code=404, detail="Imagem não encontrada")

    return ImageResponse(**images_db[image_id])


@router.get("/", response_model=list[ImageResponse])
async def list_images():
    """Listar todas as imagens."""
    return [ImageResponse(**img) for img in images_db.values()]
