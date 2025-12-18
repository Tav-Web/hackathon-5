"""
Endpoints para chat com IA sobre análises de mudanças.

Permite fazer perguntas sobre análises concluídas e obter
respostas contextualizadas usando LLM.
"""

from typing import Tuple, Optional, Union

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.gee_analysis import GeeAnalysis
from app.models.analysis import Analysis
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    AutoAnalysisResponse,
    ChatSuggestionsResponse,
    SuggestedQuestion,
)
from app.services.llm_service import llm_service

router = APIRouter()


def _analysis_to_context(analysis: GeeAnalysis) -> dict:
    """Converte análise para contexto do LLM com dados enriquecidos."""
    context = {
        "start_date": str(analysis.start_date) if analysis.start_date else None,
        "end_date": str(analysis.end_date) if analysis.end_date else None,
        "images_found": analysis.images_found,
        "cloud_tolerance": analysis.cloud_tolerance,
    }

    # Classificação com descrição
    if analysis.classification:
        # Mapeamento de tipos para descrições
        classification_descriptions = {
            "NOVA_CONSTRUCAO": "Área onde vegetação foi removida e substituída por construção",
            "ENTULHO": "Presença de solo exposto, terraplanagem ou depósito de material",
            "QUEIMADA": "Área afetada por queimada recente",
            "DESMATAMENTO": "Redução significativa de cobertura vegetal",
            "REFLORESTAMENTO": "Aumento de cobertura vegetal na região",
            "EXPANSAO_URBANA": "Expansão de área urbana sobre vegetação",
            "SEM_MUDANCA": "Sem alterações significativas detectadas",
        }
        context["classification"] = {
            "change_type": analysis.classification,
            "confidence": analysis.confidence,
            "alert_level": analysis.alert_level,
            "description": classification_descriptions.get(
                analysis.classification,
                "Mudança territorial detectada"
            ),
        }

    # Índices do início do período
    if analysis.ndvi_start is not None:
        context["indices_start"] = {
            "ndvi": analysis.ndvi_start,
            "ndbi": analysis.ndbi_start,
            "bsi": analysis.bsi_start,
            "nbr": analysis.nbr_start,
        }

    # Índices do fim do período
    if analysis.ndvi_end is not None:
        context["indices_end"] = {
            "ndvi": analysis.ndvi_end,
            "ndbi": analysis.ndbi_end,
            "bsi": analysis.bsi_end,
            "nbr": analysis.nbr_end,
        }

    # Deltas (variações)
    if analysis.delta_ndvi is not None:
        context["deltas"] = {
            "ndvi": analysis.delta_ndvi,
            "ndbi": analysis.delta_ndbi,
            "bsi": analysis.delta_bsi,
            "nbr": analysis.delta_nbr,
        }

    # Série temporal - mostra evolução dos índices ao longo do tempo
    if analysis.time_series and len(analysis.time_series) > 0:
        ts = analysis.time_series
        context["time_series_summary"] = {
            "total_points": len(ts),
            "first_date": ts[0].get("date") if ts else None,
            "last_date": ts[-1].get("date") if ts else None,
            # Incluir alguns pontos para contexto
            "sample_points": ts[:3] + ts[-3:] if len(ts) > 6 else ts,
        }

    # Geometria - extrair centro aproximado se disponível
    if analysis.geometry:
        geom = analysis.geometry
        if geom.get("type") == "Polygon" and geom.get("coordinates"):
            coords = geom["coordinates"][0]
            if coords:
                # Calcular centro aproximado
                lons = [c[0] for c in coords]
                lats = [c[1] for c in coords]
                context["location"] = {
                    "center_lon": sum(lons) / len(lons),
                    "center_lat": sum(lats) / len(lats),
                    "num_vertices": len(coords),
                }

    return context


def _satellite_to_context(analysis: Union[Analysis, dict]) -> dict:
    """Converte satellite analysis para contexto do LLM com dados ricos."""
    # Handle dict from in-memory cache
    if isinstance(analysis, dict):
        changes = analysis.get("changes", [])

        # Agregar estatísticas por tipo de mudança
        change_stats = {}
        spectral_summary = {
            "ndvi_change_avg": 0.0,
            "ndbi_change_avg": 0.0,
            "ndwi_change_avg": 0.0,
        }

        for change in changes:
            ctype = change.get("type", "unknown")
            if ctype not in change_stats:
                change_stats[ctype] = {"count": 0, "total_area": 0.0}
            change_stats[ctype]["count"] += 1
            change_stats[ctype]["total_area"] += change.get("area", 0)

            # Acumular spectral info
            spectral = change.get("spectral", {})
            spectral_summary["ndvi_change_avg"] += spectral.get("ndvi_change", 0)
            spectral_summary["ndwi_change_avg"] += spectral.get("ndwi_change", 0)
            spectral_summary["ndbi_change_avg"] += spectral.get("ndbi_change", 0)

        # Normalizar médias
        n = len(changes) or 1
        for key in spectral_summary:
            spectral_summary[key] /= n

        # Ordenar mudanças por área (maiores primeiro) e pegar top 5
        sorted_changes = sorted(changes, key=lambda x: x.get("area", 0), reverse=True)
        top_changes = []
        for c in sorted_changes[:5]:
            top_changes.append({
                "type": c.get("type", "unknown"),
                "area": c.get("area", 0),
                "confidence": c.get("confidence", 0),
                "centroid": c.get("centroid", (0, 0)),
                "spectral": c.get("spectral", {}),
            })

        return {
            "type": "satellite_comparison",
            "total_changes": len(changes),
            "total_area_changed": sum(c.get("area", 0) for c in changes),
            "created_at": analysis.get("created_at", ""),
            "status": analysis.get("status", "completed"),
            "threshold": analysis.get("threshold", 0.15),
            "min_area": analysis.get("min_area", 100),
            "change_types": change_stats,
            "spectral_summary": spectral_summary,
            "changes_detail": top_changes,
        }

    # Handle SQLAlchemy model (database - less detailed)
    return {
        "type": "satellite_comparison",
        "total_changes": analysis.total_changes,
        "total_area_changed": analysis.total_area_changed,
        "created_at": str(analysis.created_at),
        "status": analysis.status.value if analysis.status else None,
        "threshold": analysis.threshold,
        "min_area": analysis.min_area,
        "change_types": {},
        "spectral_summary": {},
        "changes_detail": [],
    }


def _get_analysis(
    db: Session, analysis_id: int, analysis_type: str = "auto"
) -> Tuple[Optional[str], Optional[Union[GeeAnalysis, Analysis, dict]]]:
    """Busca análise em ambas tabelas e no cache de satélite.

    Returns:
        Tuple of (analysis_type, analysis_object) or (None, None) if not found.
    """
    # Tentar GEE primeiro se auto ou gee
    if analysis_type in ("auto", "gee"):
        gee = db.query(GeeAnalysis).filter(GeeAnalysis.id == analysis_id).first()
        if gee:
            return ("gee", gee)

    # Tentar Satellite - primeiro no cache em memória
    if analysis_type in ("auto", "satellite"):
        # Import satellite analyses cache
        from app.api.v1.endpoints.satellite import analyses_db

        # Check in-memory satellite analyses
        sat_analysis = analyses_db.get(str(analysis_id))
        if sat_analysis:
            return ("satellite_cache", sat_analysis)

        # Try database table (if exists)
        try:
            sat = db.query(Analysis).filter(Analysis.id == analysis_id).first()
            if sat:
                return ("satellite", sat)
        except Exception:
            # Table might not exist - skip database search
            pass

    return (None, None)


def _get_context_for_analysis(
    analysis_type: str, analysis: Union[GeeAnalysis, Analysis, dict]
) -> dict:
    """Obtém contexto apropriado baseado no tipo de análise."""
    if analysis_type == "gee":
        return _analysis_to_context(analysis)
    else:
        # Both "satellite" and "satellite_cache" use the same context function
        return _satellite_to_context(analysis)


@router.post("/ask", response_model=ChatResponse)
async def ask_question(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Faz uma pergunta sobre uma análise concluída.

    A IA responde com base nos dados da análise, incluindo
    índices espectrais, classificação e contexto temporal.

    Parâmetros:
    - analysis_id: ID da análise de referência
    - question: Pergunta do usuário (3-1000 caracteres)
    - analysis_type: Tipo de análise (auto, gee, satellite)
    """
    # Busca análise em ambas tabelas
    analysis_type, analysis = _get_analysis(
        db, request.analysis_id, request.analysis_type
    )

    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    # Verificar status (diferentes campos para cada tipo)
    if analysis_type == "gee":
        if analysis.status != "completed":
            raise HTTPException(
                status_code=400,
                detail=f"Análise ainda não concluída. Status: {analysis.status}"
            )
    elif analysis_type == "satellite_cache":
        # Dict from in-memory cache - status is a string
        status = analysis.get("status", "")
        if status != "completed":
            raise HTTPException(
                status_code=400,
                detail=f"Análise ainda não concluída. Status: {status}"
            )
    else:  # satellite from database
        if analysis.status.value != "completed":
            raise HTTPException(
                status_code=400,
                detail=f"Análise ainda não concluída. Status: {analysis.status.value}"
            )

    # Monta contexto apropriado para o tipo
    context = _get_context_for_analysis(analysis_type, analysis)

    # Gera resposta
    try:
        answer = llm_service.answer_question(
            question=request.question,
            analysis_data=context,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao gerar resposta: {str(e)}"
        )

    # Monta lista de fontes usadas
    sources = []
    if analysis_type == "gee":
        if hasattr(analysis, "classification") and analysis.classification:
            sources.append(f"Classificação: {analysis.classification}")
        if hasattr(analysis, "delta_ndvi") and analysis.delta_ndvi is not None:
            sources.append("Índices espectrais (NDVI, NDBI, BSI, NBR)")
        if hasattr(analysis, "time_series") and analysis.time_series:
            sources.append(f"Série temporal ({len(analysis.time_series)} pontos)")
    elif analysis_type == "satellite_cache":
        # Dict from in-memory cache
        total_changes = analysis.get("total_changes", 0)
        total_area = analysis.get("total_area_changed", 0)
        if total_changes > 0:
            sources.append(f"Mudanças detectadas: {total_changes}")
        if total_area > 0:
            sources.append(f"Área total alterada: {total_area:.2f}")
    else:  # satellite from database
        if analysis.total_changes > 0:
            sources.append(f"Mudanças detectadas: {analysis.total_changes}")
        if analysis.total_area_changed > 0:
            sources.append(f"Área total alterada: {analysis.total_area_changed:.2f}")

    return ChatResponse(
        answer=answer,
        sources=sources,
        analysis_id=request.analysis_id,
    )


@router.get("/{analysis_id}/auto-analysis", response_model=AutoAnalysisResponse)
async def get_auto_analysis(
    analysis_id: int,
    analysis_type: str = "auto",
    db: Session = Depends(get_db)
):
    """
    Obtém a análise automática gerada pela IA.

    Se a análise automática ainda não foi gerada, gera agora.
    Esta análise inclui resumo, interpretação técnica e recomendações.

    Parâmetros:
    - analysis_id: ID da análise
    - analysis_type: Tipo de análise (auto, gee, satellite)
    """
    # Busca análise em ambas tabelas
    found_type, analysis = _get_analysis(db, analysis_id, analysis_type)

    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    # Verificar status
    if found_type == "gee":
        if analysis.status != "completed":
            raise HTTPException(
                status_code=400,
                detail=f"Análise ainda não concluída. Status: {analysis.status}"
            )
    elif found_type == "satellite_cache":
        status = analysis.get("status", "")
        if status != "completed":
            raise HTTPException(
                status_code=400,
                detail=f"Análise ainda não concluída. Status: {status}"
            )
    else:  # satellite from database
        if analysis.status.value != "completed":
            raise HTTPException(
                status_code=400,
                detail=f"Análise ainda não concluída. Status: {analysis.status.value}"
            )

    # Monta contexto
    context = _get_context_for_analysis(found_type, analysis)

    # Para GEE, verificar se já tem análise cached
    if found_type == "gee" and hasattr(analysis, "ai_analysis") and analysis.ai_analysis:
        report = llm_service.generate_report_summary(context)
        return AutoAnalysisResponse(
            analysis_id=analysis_id,
            summary=report.get("resumo", ""),
            detailed_analysis=analysis.ai_analysis,
            recommendations=report.get("recomendacoes", []),
        )

    # Gera análise agora
    try:
        ai_analysis = llm_service.analyze_changes(context)
        report = llm_service.generate_report_summary(context)

        # Salva para cache apenas se for GEE
        if found_type == "gee" and hasattr(analysis, "ai_analysis"):
            analysis.ai_analysis = ai_analysis
            db.commit()

        return AutoAnalysisResponse(
            analysis_id=analysis_id,
            summary=report.get("resumo", ""),
            detailed_analysis=ai_analysis,
            recommendations=report.get("recomendacoes", []),
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao gerar análise: {str(e)}"
        )


@router.get("/{analysis_id}/suggestions", response_model=ChatSuggestionsResponse)
async def get_suggestions(
    analysis_id: int,
    analysis_type: str = "auto",
    db: Session = Depends(get_db)
):
    """
    Obtém sugestões de perguntas para o usuário.

    As sugestões são baseadas no tipo de mudança detectada
    e incluem perguntas relevantes sobre impacto, causas e ações.

    Parâmetros:
    - analysis_id: ID da análise
    - analysis_type: Tipo de análise (auto, gee, satellite)
    """
    # Busca análise em ambas tabelas
    found_type, analysis = _get_analysis(db, analysis_id, analysis_type)

    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    # Monta contexto
    context = _get_context_for_analysis(found_type, analysis)

    # Obtém sugestões personalizadas
    suggestions_data = llm_service.get_suggested_questions(context)

    suggestions = [
        SuggestedQuestion(
            question=s["question"],
            category=s["category"]
        )
        for s in suggestions_data
    ]

    return ChatSuggestionsResponse(
        analysis_id=analysis_id,
        suggestions=suggestions,
    )


@router.post("/{analysis_id}/regenerate-analysis")
async def regenerate_analysis(
    analysis_id: int,
    analysis_type: str = "auto",
    db: Session = Depends(get_db)
):
    """
    Regenera a análise automática da IA.

    Útil se quiser obter uma nova interpretação dos dados
    ou se a análise original foi perdida.

    Parâmetros:
    - analysis_id: ID da análise
    - analysis_type: Tipo de análise (auto, gee, satellite)
    """
    # Busca análise em ambas tabelas
    found_type, analysis = _get_analysis(db, analysis_id, analysis_type)

    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    # Verificar status
    if found_type == "gee":
        if analysis.status != "completed":
            raise HTTPException(
                status_code=400,
                detail=f"Análise ainda não concluída. Status: {analysis.status}"
            )
    elif found_type == "satellite_cache":
        status = analysis.get("status", "")
        if status != "completed":
            raise HTTPException(
                status_code=400,
                detail=f"Análise ainda não concluída. Status: {status}"
            )
    else:  # satellite from database
        if analysis.status.value != "completed":
            raise HTTPException(
                status_code=400,
                detail=f"Análise ainda não concluída. Status: {analysis.status.value}"
            )

    # Monta contexto
    context = _get_context_for_analysis(found_type, analysis)

    try:
        # Regenera análise
        ai_analysis = llm_service.analyze_changes(context)

        # Salva apenas se for GEE
        if found_type == "gee" and hasattr(analysis, "ai_analysis"):
            analysis.ai_analysis = ai_analysis
            db.commit()

        return {
            "message": "Análise regenerada com sucesso",
            "ai_analysis": ai_analysis,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao regenerar análise: {str(e)}"
        )
