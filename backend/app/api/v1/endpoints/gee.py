"""
Endpoints para análise de mudanças via Google Earth Engine.

Permite criar análises de mudanças territoriais usando imagens
Sentinel-2 e índices espectrais.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from shapely.geometry import shape
from geoalchemy2.shape import from_shape

from app.db.session import get_db
from app.models.gee_analysis import GeeAnalysis
from app.schemas.gee import (
    GeeAnalysisCreate,
    GeeAnalysisResponse,
    GeeAnalysisList,
    AnalysisStatus,
    ClassificationResult,
    SpectralIndices,
    TimeSeriesPoint,
)

router = APIRouter()


def _model_to_response(analysis: GeeAnalysis) -> GeeAnalysisResponse:
    """Converte modelo SQLAlchemy para schema de resposta."""
    classification = None
    if analysis.classification:
        classification = ClassificationResult(
            change_type=analysis.classification,
            confidence=analysis.confidence or 0.0,
            description="",  # Será preenchido pelo classificador
            alert_level=analysis.alert_level or "info",
        )

    indices_start = None
    if analysis.ndvi_start is not None:
        indices_start = SpectralIndices(
            ndvi=analysis.ndvi_start,
            ndbi=analysis.ndbi_start or 0.0,
            bsi=analysis.bsi_start or 0.0,
            nbr=analysis.nbr_start or 0.0,
        )

    indices_end = None
    if analysis.ndvi_end is not None:
        indices_end = SpectralIndices(
            ndvi=analysis.ndvi_end,
            ndbi=analysis.ndbi_end or 0.0,
            bsi=analysis.bsi_end or 0.0,
            nbr=analysis.nbr_end or 0.0,
        )

    deltas = None
    if analysis.delta_ndvi is not None:
        deltas = SpectralIndices(
            ndvi=analysis.delta_ndvi,
            ndbi=analysis.delta_ndbi or 0.0,
            bsi=analysis.delta_bsi or 0.0,
            nbr=analysis.delta_nbr or 0.0,
        )

    time_series = None
    if analysis.time_series:
        time_series = [
            TimeSeriesPoint(**point) for point in analysis.time_series
        ]

    return GeeAnalysisResponse(
        id=analysis.id,
        status=AnalysisStatus(analysis.status),
        progress=analysis.progress,
        geometry=analysis.geometry,
        start_date=analysis.start_date,
        end_date=analysis.end_date,
        images_found=analysis.images_found,
        classification=classification,
        indices_start=indices_start,
        indices_end=indices_end,
        deltas=deltas,
        time_series=time_series,
        tile_url_before=analysis.tile_url_before,
        tile_url_after=analysis.tile_url_after,
        ai_analysis=analysis.ai_analysis,
        created_at=analysis.created_at,
        completed_at=analysis.completed_at,
        error_message=analysis.error_message,
    )


@router.post("/analyze", response_model=GeeAnalysisResponse)
async def create_analysis(
    data: GeeAnalysisCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Inicia uma nova análise de mudanças via Google Earth Engine.

    A análise é processada de forma assíncrona. Use o endpoint GET
    para verificar o status e obter os resultados quando concluído.

    Parâmetros:
    - geometry: GeoJSON da área de interesse (Polygon, Point ou MultiPolygon)
    - radius_meters: Raio em metros (apenas se geometry for Point)
    - start_date: Data inicial do período (YYYY-MM-DD)
    - end_date: Data final do período (YYYY-MM-DD)
    - cloud_tolerance: Tolerância máxima de nuvens (0-100%)
    """
    # Valida datas
    if data.start_date >= data.end_date:
        raise HTTPException(
            status_code=400,
            detail="Data inicial deve ser anterior à data final"
        )

    # Valida geometria Point com radius
    if data.geometry.get("type") == "Point" and not data.radius_meters:
        raise HTTPException(
            status_code=400,
            detail="radius_meters é obrigatório para geometria do tipo Point"
        )

    # Cria geometria PostGIS
    try:
        geom_shape = shape(data.geometry)
        geometry_geom = from_shape(geom_shape, srid=4326)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Geometria inválida: {str(e)}"
        )

    # Cria registro no banco
    analysis = GeeAnalysis(
        geometry=data.geometry,
        geometry_geom=geometry_geom,
        start_date=data.start_date,
        end_date=data.end_date,
        cloud_tolerance=data.cloud_tolerance,
        status="pending",
        progress=0,
    )

    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    # Enfileira processamento assíncrono
    try:
        from app.tasks.gee_task import process_gee_analysis
        process_gee_analysis.delay(
            analysis_id=analysis.id,
            radius_meters=data.radius_meters
        )
    except Exception as e:
        # Celery não disponível - usa background task
        import logging
        logging.warning(f"Celery não disponível, usando BackgroundTasks: {e}")

        async def run_analysis():
            from app.services.gee_service import gee_service
            from app.services.llm_service import llm_service

            try:
                # Atualiza status
                analysis.status = "processing"
                analysis.progress = 10
                db.commit()

                # Executa análise
                result = await gee_service.run_full_analysis(
                    geometry=data.geometry,
                    start_date=data.start_date,
                    end_date=data.end_date,
                    cloud_tolerance=data.cloud_tolerance,
                    radius_meters=data.radius_meters,
                )

                # Atualiza com resultados
                analysis.progress = 70

                # Índices
                if indices_start := result.get("indices_start"):
                    analysis.ndvi_start = indices_start.get("ndvi")
                    analysis.ndbi_start = indices_start.get("ndbi")
                    analysis.bsi_start = indices_start.get("bsi")
                    analysis.nbr_start = indices_start.get("nbr")

                if indices_end := result.get("indices_end"):
                    analysis.ndvi_end = indices_end.get("ndvi")
                    analysis.ndbi_end = indices_end.get("ndbi")
                    analysis.bsi_end = indices_end.get("bsi")
                    analysis.nbr_end = indices_end.get("nbr")

                if deltas := result.get("deltas"):
                    analysis.delta_ndvi = deltas.get("ndvi")
                    analysis.delta_ndbi = deltas.get("ndbi")
                    analysis.delta_bsi = deltas.get("bsi")
                    analysis.delta_nbr = deltas.get("nbr")

                # Classificação
                if classification := result.get("classification"):
                    analysis.classification = classification.get("change_type")
                    analysis.confidence = classification.get("confidence")
                    analysis.alert_level = classification.get("alert_level")

                # Série temporal e tiles
                analysis.time_series = result.get("time_series")
                analysis.tile_url_before = result.get("tile_url_before")
                analysis.tile_url_after = result.get("tile_url_after")
                analysis.images_found = result.get("images_found", 0)

                db.commit()

                # Análise com IA
                analysis.progress = 85
                try:
                    ai_analysis = llm_service.analyze_changes(result)
                    analysis.ai_analysis = ai_analysis
                except Exception as llm_error:
                    logging.warning(f"Falha na análise LLM: {llm_error}")

                # Finaliza
                analysis.status = "completed"
                analysis.progress = 100
                from datetime import datetime
                analysis.completed_at = datetime.utcnow()
                db.commit()

            except Exception as e:
                logging.error(f"Erro na análise GEE: {e}")
                analysis.status = "failed"
                analysis.error_message = str(e)
                db.commit()

        background_tasks.add_task(run_analysis)

    return _model_to_response(analysis)


@router.get("/{analysis_id}", response_model=GeeAnalysisResponse)
async def get_analysis(analysis_id: int, db: Session = Depends(get_db)):
    """
    Obtém o status e resultados de uma análise.

    Use este endpoint para verificar o progresso de uma análise
    em andamento ou obter os resultados quando concluída.
    """
    analysis = db.query(GeeAnalysis).filter(GeeAnalysis.id == analysis_id).first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    return _model_to_response(analysis)


@router.get("/{analysis_id}/tiles")
async def get_analysis_tiles(analysis_id: int, db: Session = Depends(get_db)):
    """
    Obtém URLs de tiles para visualização no mapa.

    Retorna URLs de tiles XYZ para as imagens antes e depois
    da mudança detectada.
    """
    analysis = db.query(GeeAnalysis).filter(GeeAnalysis.id == analysis_id).first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    if analysis.status != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Análise ainda não concluída. Status: {analysis.status}"
        )

    return {
        "tile_url_before": analysis.tile_url_before,
        "tile_url_after": analysis.tile_url_after,
    }


@router.get("/", response_model=GeeAnalysisList)
async def list_analyses(
    page: int = 1,
    page_size: int = 10,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    """
    Lista todas as análises com paginação.

    Parâmetros:
    - page: Número da página (começa em 1)
    - page_size: Itens por página (máx 100)
    - status: Filtrar por status (pending, processing, completed, failed)
    """
    if page_size > 100:
        page_size = 100

    query = db.query(GeeAnalysis)

    if status:
        query = query.filter(GeeAnalysis.status == status)

    total = query.count()

    analyses = (
        query
        .order_by(GeeAnalysis.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return GeeAnalysisList(
        items=[_model_to_response(a) for a in analyses],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.delete("/{analysis_id}")
async def delete_analysis(analysis_id: int, db: Session = Depends(get_db)):
    """Exclui uma análise."""
    analysis = db.query(GeeAnalysis).filter(GeeAnalysis.id == analysis_id).first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    db.delete(analysis)
    db.commit()

    return {"message": "Análise excluída com sucesso"}
