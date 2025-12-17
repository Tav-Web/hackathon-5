"""
Schemas Pydantic para o chat com IA.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class MessageRole(str, Enum):
    """Papel da mensagem no chat."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ChatMessage(BaseModel):
    """Mensagem individual no chat."""
    role: MessageRole
    content: str
    timestamp: datetime | None = None


class ChatRequest(BaseModel):
    """Requisição de pergunta ao chat."""
    analysis_id: int = Field(..., description="ID da análise de referência")
    question: str = Field(
        ...,
        min_length=3,
        max_length=1000,
        description="Pergunta do usuário sobre a análise"
    )


class ChatResponse(BaseModel):
    """Resposta do chat."""
    answer: str = Field(..., description="Resposta gerada pela IA")
    sources: list[str] = Field(
        default_factory=list,
        description="Fontes de dados usadas na resposta"
    )
    analysis_id: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class AutoAnalysisResponse(BaseModel):
    """Resposta da análise automática gerada pela IA."""
    analysis_id: int
    summary: str = Field(..., description="Resumo da análise")
    detailed_analysis: str = Field(..., description="Análise detalhada")
    recommendations: list[str] = Field(
        default_factory=list,
        description="Recomendações baseadas na análise"
    )
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class SuggestedQuestion(BaseModel):
    """Sugestão de pergunta para o usuário."""
    question: str
    category: str = Field(..., description="Categoria da pergunta")


class ChatSuggestionsResponse(BaseModel):
    """Sugestões de perguntas para o usuário."""
    analysis_id: int
    suggestions: list[SuggestedQuestion] = Field(
        default_factory=lambda: [
            SuggestedQuestion(
                question="Qual o impacto ambiental dessa mudança?",
                category="impacto"
            ),
            SuggestedQuestion(
                question="O que pode ter causado essa alteração?",
                category="causa"
            ),
            SuggestedQuestion(
                question="Essa mudança é reversível?",
                category="reversibilidade"
            ),
            SuggestedQuestion(
                question="Quais medidas preventivas poderiam ser tomadas?",
                category="prevenção"
            ),
            SuggestedQuestion(
                question="Como essa mudança afeta o ecossistema local?",
                category="ecossistema"
            ),
            SuggestedQuestion(
                question="Existem áreas vizinhas em risco?",
                category="risco"
            ),
        ]
    )
