import uuid
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.api.v1.endpoints.images import images_db
from app.core.detection.change_detector import detect_changes
from app.schemas.analysis import (
    AnalysisCreate,
    AnalysisResponse,
    AnalysisStatus,
    AnalysisStatusResponse,
)

router = APIRouter()

# Armazenamento temporário em memória
analyses_db: dict[str, dict] = {}
changes_db: dict[str, list] = {}


async def process_analysis(analysis_id: str):
    """Processa a análise em background."""
    analysis = analyses_db.get(analysis_id)
    if not analysis:
        return

    try:
        analyses_db[analysis_id]["status"] = AnalysisStatus.PROCESSING

        # Obter caminhos das imagens
        image_before = images_db.get(analysis["image_before_id"])
        image_after = images_db.get(analysis["image_after_id"])

        if not image_before or not image_after:
            raise ValueError("Imagens não encontradas")

        # Detectar mudanças
        changes = await detect_changes(
            image_before["filepath"],
            image_after["filepath"],
            threshold=analysis.get("threshold", 0.3),
            min_area=analysis.get("min_area", 100),
        )

        # Salvar resultados
        changes_db[analysis_id] = changes
        analyses_db[analysis_id].update(
            {
                "status": AnalysisStatus.COMPLETED,
                "completed_at": datetime.utcnow(),
                "total_changes": len(changes),
                "total_area_changed": sum(c.get("area", 0) for c in changes),
            }
        )
    except Exception as e:
        analyses_db[analysis_id].update(
            {
                "status": AnalysisStatus.FAILED,
                "error": str(e),
            }
        )


@router.post("/compare", response_model=AnalysisResponse)
async def compare_images(data: AnalysisCreate, background_tasks: BackgroundTasks):
    """Inicia comparação entre duas imagens."""
    # Validar que as imagens existem
    if data.image_before_id not in images_db:
        raise HTTPException(status_code=404, detail="Imagem 'antes' não encontrada")
    if data.image_after_id not in images_db:
        raise HTTPException(status_code=404, detail="Imagem 'depois' não encontrada")

    # Criar análise
    analysis_id = str(uuid.uuid4())
    analysis = {
        "id": analysis_id,
        "image_before_id": data.image_before_id,
        "image_after_id": data.image_after_id,
        "threshold": data.threshold,
        "min_area": data.min_area,
        "status": AnalysisStatus.PENDING,
        "created_at": datetime.utcnow(),
        "completed_at": None,
        "total_changes": 0,
        "total_area_changed": 0.0,
    }
    analyses_db[analysis_id] = analysis

    # Iniciar processamento em background
    background_tasks.add_task(process_analysis, analysis_id)

    return AnalysisResponse(**analysis)


@router.get("/{analysis_id}", response_model=AnalysisStatusResponse)
async def get_analysis_status(analysis_id: str):
    """Obter status de uma análise."""
    if analysis_id not in analyses_db:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    analysis = analyses_db[analysis_id]
    progress = 0
    if analysis["status"] == AnalysisStatus.COMPLETED:
        progress = 100
    elif analysis["status"] == AnalysisStatus.PROCESSING:
        progress = 50

    return AnalysisStatusResponse(
        id=analysis_id,
        status=analysis["status"],
        progress=progress,
        message=analysis.get("error"),
    )


@router.get("/", response_model=list[AnalysisResponse])
async def list_analyses():
    """Listar todas as análises."""
    return [AnalysisResponse(**a) for a in analyses_db.values()]
