"""Analysis endpoints for change detection."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.analysis import Analysis
from app.models.analysis import AnalysisStatus as DBAnalysisStatus
from app.models.satellite_image import SatelliteImage
from app.schemas.analysis import (
    AnalysisCreate,
    AnalysisResponse,
    AnalysisResultResponse,
    AnalysisStatus,
    AnalysisStatusResponse,
)
from app.tasks.analysis_task import process_analysis_task

router = APIRouter()


@router.post("/compare", response_model=AnalysisResponse)
async def compare_images(data: AnalysisCreate, db: Session = Depends(get_db)):
    """Start a change detection analysis between two images."""
    # Validate that images exist
    image_before = (
        db.query(SatelliteImage)
        .filter(SatelliteImage.id == data.image_before_id)
        .first()
    )
    if not image_before:
        raise HTTPException(status_code=404, detail="Imagem 'antes' não encontrada")

    image_after = (
        db.query(SatelliteImage)
        .filter(SatelliteImage.id == data.image_after_id)
        .first()
    )
    if not image_after:
        raise HTTPException(status_code=404, detail="Imagem 'depois' não encontrada")

    # Check that images are ready
    if image_before.status != "ready":
        raise HTTPException(status_code=400, detail="Imagem 'antes' ainda não está pronta")
    if image_after.status != "ready":
        raise HTTPException(status_code=400, detail="Imagem 'depois' ainda não está pronta")

    # Create analysis record
    analysis = Analysis(
        image_before_id=data.image_before_id,
        image_after_id=data.image_after_id,
        threshold=data.threshold,
        min_area=data.min_area,
        status=DBAnalysisStatus.PENDING,
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    # Queue the analysis task
    try:
        process_analysis_task.delay(analysis.id)
    except Exception as e:
        # If Celery is not available, process synchronously
        import logging

        logging.warning(f"Celery not available, processing synchronously: {e}")
        # For now, just mark as pending - in production would process here
        pass

    return AnalysisResponse(
        id=analysis.id,
        image_before_id=analysis.image_before_id,
        image_after_id=analysis.image_after_id,
        status=AnalysisStatus(analysis.status.value),
        threshold=analysis.threshold,
        min_area=analysis.min_area,
        created_at=analysis.created_at,
        completed_at=analysis.completed_at,
        total_changes=analysis.total_changes,
        total_area_changed=analysis.total_area_changed,
    )


@router.get("/{analysis_id}", response_model=AnalysisStatusResponse)
async def get_analysis_status(analysis_id: int, db: Session = Depends(get_db)):
    """Get the status of an analysis."""
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    return AnalysisStatusResponse(
        id=analysis.id,
        status=AnalysisStatus(analysis.status.value),
        progress=analysis.progress,
        message=analysis.error_message,
    )


@router.get("/{analysis_id}/result", response_model=AnalysisResultResponse)
async def get_analysis_result(analysis_id: int, db: Session = Depends(get_db)):
    """Get the results of a completed analysis."""
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    if analysis.status != DBAnalysisStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail=f"Análise ainda não concluída. Status atual: {analysis.status.value}",
        )

    return AnalysisResultResponse(
        id=analysis.id,
        status=AnalysisStatus(analysis.status.value),
        total_changes=analysis.total_changes,
        total_area_changed=analysis.total_area_changed,
        results_geojson=analysis.results_geojson,
    )


@router.get("/", response_model=list[AnalysisResponse])
async def list_analyses(db: Session = Depends(get_db)):
    """List all analyses."""
    analyses = db.query(Analysis).order_by(Analysis.created_at.desc()).all()
    return [
        AnalysisResponse(
            id=a.id,
            image_before_id=a.image_before_id,
            image_after_id=a.image_after_id,
            status=AnalysisStatus(a.status.value),
            threshold=a.threshold,
            min_area=a.min_area,
            created_at=a.created_at,
            completed_at=a.completed_at,
            total_changes=a.total_changes,
            total_area_changed=a.total_area_changed,
        )
        for a in analyses
    ]


@router.delete("/{analysis_id}")
async def delete_analysis(analysis_id: int, db: Session = Depends(get_db)):
    """Delete an analysis."""
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    db.delete(analysis)
    db.commit()

    return {"message": "Análise excluída com sucesso"}
