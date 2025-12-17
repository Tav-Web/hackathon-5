"""
Endpoints para chat com IA sobre análises de mudanças.

Permite fazer perguntas sobre análises concluídas e obter
respostas contextualizadas usando LLM.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.gee_analysis import GeeAnalysis
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
    """Converte análise para contexto do LLM."""
    context = {
        "start_date": str(analysis.start_date) if analysis.start_date else None,
        "end_date": str(analysis.end_date) if analysis.end_date else None,
        "images_found": analysis.images_found,
    }

    if analysis.classification:
        context["classification"] = {
            "change_type": analysis.classification,
            "confidence": analysis.confidence,
            "alert_level": analysis.alert_level,
        }

    if analysis.ndvi_start is not None:
        context["indices_start"] = {
            "ndvi": analysis.ndvi_start,
            "ndbi": analysis.ndbi_start,
            "bsi": analysis.bsi_start,
            "nbr": analysis.nbr_start,
        }

    if analysis.ndvi_end is not None:
        context["indices_end"] = {
            "ndvi": analysis.ndvi_end,
            "ndbi": analysis.ndbi_end,
            "bsi": analysis.bsi_end,
            "nbr": analysis.nbr_end,
        }

    if analysis.delta_ndvi is not None:
        context["deltas"] = {
            "ndvi": analysis.delta_ndvi,
            "ndbi": analysis.delta_ndbi,
            "bsi": analysis.delta_bsi,
            "nbr": analysis.delta_nbr,
        }

    return context


@router.post("/ask", response_model=ChatResponse)
async def ask_question(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Faz uma pergunta sobre uma análise concluída.

    A IA responde com base nos dados da análise, incluindo
    índices espectrais, classificação e contexto temporal.

    Parâmetros:
    - analysis_id: ID da análise de referência
    - question: Pergunta do usuário (3-1000 caracteres)
    """
    # Busca análise
    analysis = (
        db.query(GeeAnalysis)
        .filter(GeeAnalysis.id == request.analysis_id)
        .first()
    )

    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    if analysis.status != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Análise ainda não concluída. Status: {analysis.status}"
        )

    # Monta contexto
    context = _analysis_to_context(analysis)

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
    if analysis.classification:
        sources.append(f"Classificação: {analysis.classification}")
    if analysis.delta_ndvi is not None:
        sources.append("Índices espectrais (NDVI, NDBI, BSI, NBR)")
    if analysis.time_series:
        sources.append(f"Série temporal ({len(analysis.time_series)} pontos)")

    return ChatResponse(
        answer=answer,
        sources=sources,
        analysis_id=request.analysis_id,
    )


@router.get("/{analysis_id}/auto-analysis", response_model=AutoAnalysisResponse)
async def get_auto_analysis(analysis_id: int, db: Session = Depends(get_db)):
    """
    Obtém a análise automática gerada pela IA.

    Se a análise automática ainda não foi gerada, gera agora.
    Esta análise inclui resumo, interpretação técnica e recomendações.
    """
    analysis = (
        db.query(GeeAnalysis)
        .filter(GeeAnalysis.id == analysis_id)
        .first()
    )

    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    if analysis.status != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Análise ainda não concluída. Status: {analysis.status}"
        )

    # Se já tem análise, retorna
    if analysis.ai_analysis:
        # Gera recomendações estruturadas
        context = _analysis_to_context(analysis)
        report = llm_service.generate_report_summary(context)

        return AutoAnalysisResponse(
            analysis_id=analysis_id,
            summary=report.get("resumo", ""),
            detailed_analysis=analysis.ai_analysis,
            recommendations=report.get("recomendacoes", []),
        )

    # Gera análise agora
    context = _analysis_to_context(analysis)

    try:
        ai_analysis = llm_service.analyze_changes(context)
        report = llm_service.generate_report_summary(context)

        # Salva para cache
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
async def get_suggestions(analysis_id: int, db: Session = Depends(get_db)):
    """
    Obtém sugestões de perguntas para o usuário.

    As sugestões são baseadas no tipo de mudança detectada
    e incluem perguntas relevantes sobre impacto, causas e ações.
    """
    analysis = (
        db.query(GeeAnalysis)
        .filter(GeeAnalysis.id == analysis_id)
        .first()
    )

    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    # Monta contexto
    context = _analysis_to_context(analysis)

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
async def regenerate_analysis(analysis_id: int, db: Session = Depends(get_db)):
    """
    Regenera a análise automática da IA.

    Útil se quiser obter uma nova interpretação dos dados
    ou se a análise original foi perdida.
    """
    analysis = (
        db.query(GeeAnalysis)
        .filter(GeeAnalysis.id == analysis_id)
        .first()
    )

    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    if analysis.status != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Análise ainda não concluída. Status: {analysis.status}"
        )

    # Monta contexto
    context = _analysis_to_context(analysis)

    try:
        # Regenera análise
        ai_analysis = llm_service.analyze_changes(context)

        # Salva
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
