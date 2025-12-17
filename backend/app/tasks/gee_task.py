"""
Celery task para análise de mudanças via Google Earth Engine.

Processa análises de forma assíncrona:
1. Busca imagens Sentinel-2
2. Aplica máscara de nuvens
3. Calcula índices espectrais
4. Extrai série temporal
5. Compara períodos
6. Classifica mudança
7. Gera análise com IA
"""

import logging
from datetime import datetime


from app.celery_app import celery_app
from app.db.session import SessionLocal
from app.models.gee_analysis import GeeAnalysis

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3)
def process_gee_analysis(
    self,
    analysis_id: int,
    radius_meters: int | None = None,
) -> dict:
    """
    Processa uma análise de mudanças via Google Earth Engine.

    Args:
        analysis_id: ID da análise no banco de dados
        radius_meters: Raio em metros (se geometria for Point)

    Returns:
        Dicionário com resumo dos resultados
    """
    db = SessionLocal()

    try:
        # Busca análise no banco
        analysis = db.query(GeeAnalysis).filter(GeeAnalysis.id == analysis_id).first()

        if not analysis:
            logger.error(f"Análise {analysis_id} não encontrada")
            return {"error": "Análise não encontrada"}

        # Atualiza status para processando
        analysis.status = "processing"
        analysis.progress = 5
        db.commit()

        logger.info(f"Iniciando análise GEE {analysis_id}")

        # Importa serviços (lazy import para evitar problemas de inicialização)
        from app.services.gee_service import gee_service
        from app.services.llm_service import llm_service

        # 1. Valida dados
        analysis.progress = 10
        db.commit()

        geometry = analysis.geometry
        start_date = analysis.start_date
        end_date = analysis.end_date
        cloud_tolerance = analysis.cloud_tolerance

        # 2. Busca e conta imagens disponíveis
        analysis.progress = 15
        db.commit()

        try:
            images_count = gee_service.get_images_count(
                geometry=geometry,
                start_date=start_date,
                end_date=end_date,
                max_cloud_cover=cloud_tolerance,
            )
            analysis.images_found = images_count
            logger.info(f"Análise {analysis_id}: {images_count} imagens encontradas")
        except Exception as e:
            logger.warning(f"Erro ao contar imagens: {e}")
            analysis.images_found = 0

        db.commit()

        # 3. Compara períodos (calcula índices e classificação)
        analysis.progress = 30
        db.commit()

        logger.info(f"Análise {analysis_id}: Comparando períodos...")

        comparison = gee_service.compare_periods(
            geometry=geometry,
            start_date=start_date,
            end_date=end_date,
            max_cloud_cover=cloud_tolerance,
            radius_meters=radius_meters,
        )

        analysis.progress = 50
        db.commit()

        # 4. Salva índices do início
        if indices_start := comparison.get("indices_start"):
            analysis.ndvi_start = indices_start.get("ndvi")
            analysis.ndbi_start = indices_start.get("ndbi")
            analysis.bsi_start = indices_start.get("bsi")
            analysis.nbr_start = indices_start.get("nbr")

        # 5. Salva índices do fim
        if indices_end := comparison.get("indices_end"):
            analysis.ndvi_end = indices_end.get("ndvi")
            analysis.ndbi_end = indices_end.get("ndbi")
            analysis.bsi_end = indices_end.get("bsi")
            analysis.nbr_end = indices_end.get("nbr")

        # 6. Salva deltas
        if deltas := comparison.get("deltas"):
            analysis.delta_ndvi = deltas.get("ndvi")
            analysis.delta_ndbi = deltas.get("ndbi")
            analysis.delta_bsi = deltas.get("bsi")
            analysis.delta_nbr = deltas.get("nbr")

        # 7. Salva classificação
        if classification := comparison.get("classification"):
            analysis.classification = classification.get("change_type")
            analysis.confidence = classification.get("confidence")
            analysis.alert_level = classification.get("alert_level")

        # Atualiza contagem de imagens se retornada
        if images := comparison.get("images_found"):
            analysis.images_found = images

        db.commit()

        # 8. Extrai série temporal
        analysis.progress = 60
        db.commit()

        logger.info(f"Análise {analysis_id}: Extraindo série temporal...")

        try:
            time_series = gee_service.get_time_series(
                geometry=geometry,
                start_date=start_date,
                end_date=end_date,
                max_cloud_cover=cloud_tolerance,
                radius_meters=radius_meters,
            )
            analysis.time_series = time_series
            logger.info(f"Análise {analysis_id}: {len(time_series)} pontos na série temporal")
        except Exception as e:
            logger.warning(f"Erro ao extrair série temporal: {e}")
            analysis.time_series = []

        db.commit()

        # 9. Gera URLs de tiles para visualização
        analysis.progress = 70
        db.commit()

        logger.info(f"Análise {analysis_id}: Gerando tiles de visualização...")

        try:
            tiles = gee_service.get_comparison_tiles(
                geometry=geometry,
                start_date=start_date,
                end_date=end_date,
                max_cloud_cover=cloud_tolerance,
            )
            analysis.tile_url_before = tiles.get("tile_url_before")
            analysis.tile_url_after = tiles.get("tile_url_after")
        except Exception as e:
            logger.warning(f"Erro ao gerar tiles: {e}")

        db.commit()

        # 10. Gera análise com IA
        analysis.progress = 85
        db.commit()

        logger.info(f"Análise {analysis_id}: Gerando análise com IA...")

        try:
            # Monta contexto para IA
            ai_context = {
                "start_date": str(start_date),
                "end_date": str(end_date),
                "images_found": analysis.images_found,
                "classification": comparison.get("classification"),
                "indices_start": comparison.get("indices_start"),
                "indices_end": comparison.get("indices_end"),
                "deltas": comparison.get("deltas"),
            }

            ai_analysis = llm_service.analyze_changes(ai_context)
            analysis.ai_analysis = ai_analysis
            logger.info(f"Análise {analysis_id}: Análise IA gerada com sucesso")
        except Exception as e:
            logger.warning(f"Erro ao gerar análise IA: {e}")
            analysis.ai_analysis = None

        db.commit()

        # 11. Finaliza análise
        analysis.status = "completed"
        analysis.progress = 100
        analysis.completed_at = datetime.utcnow()
        db.commit()

        logger.info(f"Análise GEE {analysis_id} concluída com sucesso")

        return {
            "analysis_id": analysis_id,
            "status": "completed",
            "classification": analysis.classification,
            "confidence": analysis.confidence,
            "images_found": analysis.images_found,
        }

    except Exception as e:
        logger.error(f"Análise GEE {analysis_id} falhou: {e}")

        # Atualiza status de erro
        try:
            analysis = db.query(GeeAnalysis).filter(GeeAnalysis.id == analysis_id).first()
            if analysis:
                analysis.status = "failed"
                analysis.error_message = str(e)
                db.commit()
        except Exception:
            pass

        # Retry com backoff exponencial
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))

    finally:
        db.close()


@celery_app.task
def cleanup_old_analyses(days: int = 30) -> dict:
    """
    Remove análises antigas do banco de dados.

    Args:
        days: Número de dias para manter análises

    Returns:
        Dicionário com quantidade de análises removidas
    """
    from datetime import timedelta

    db = SessionLocal()

    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        # Conta análises a serem removidas
        count = (
            db.query(GeeAnalysis)
            .filter(GeeAnalysis.created_at < cutoff_date)
            .count()
        )

        # Remove análises antigas
        db.query(GeeAnalysis).filter(GeeAnalysis.created_at < cutoff_date).delete()
        db.commit()

        logger.info(f"Removidas {count} análises antigas (> {days} dias)")

        return {"removed": count, "days": days}

    finally:
        db.close()
