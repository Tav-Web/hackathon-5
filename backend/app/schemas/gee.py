"""
Schemas Pydantic para análise via Google Earth Engine.
"""

from datetime import date, datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, field_validator


class ChangeType(str, Enum):
    """Tipos de mudança territorial."""
    NOVA_CONSTRUCAO = "NOVA_CONSTRUCAO"
    ENTULHO = "ENTULHO"
    QUEIMADA = "QUEIMADA"
    DESMATAMENTO = "DESMATAMENTO"
    REFLORESTAMENTO = "REFLORESTAMENTO"
    EXPANSAO_URBANA = "EXPANSAO_URBANA"
    SEM_MUDANCA = "SEM_MUDANCA"


class AnalysisStatus(str, Enum):
    """Status da análise."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class GeeAnalysisCreate(BaseModel):
    """Schema para criar uma análise GEE."""

    geometry: dict = Field(
        ...,
        description="GeoJSON geometry (Polygon ou Point)"
    )
    radius_meters: int | None = Field(
        default=None,
        ge=100,
        le=5000,
        description="Raio em metros (apenas para geometria Point)"
    )
    start_date: date = Field(
        ...,
        description="Data inicial do período de análise"
    )
    end_date: date = Field(
        ...,
        description="Data final do período de análise"
    )
    cloud_tolerance: int = Field(
        default=20,
        ge=0,
        le=100,
        description="Tolerância máxima de cobertura de nuvens (%)"
    )

    @field_validator("start_date")
    @classmethod
    def validate_start_date(cls, v: date) -> date:
        min_date = date(2017, 1, 1)
        if v < min_date:
            raise ValueError(f"Data inicial deve ser a partir de {min_date}")
        return v

    @field_validator("end_date")
    @classmethod
    def validate_end_date(cls, v: date, info) -> date:
        if v > date.today():
            raise ValueError("Data final não pode ser no futuro")
        return v

    @field_validator("geometry")
    @classmethod
    def validate_geometry(cls, v: dict) -> dict:
        if "type" not in v:
            raise ValueError("Geometry deve ter campo 'type'")
        if v["type"] not in ["Polygon", "Point", "MultiPolygon"]:
            raise ValueError("Geometry type deve ser Polygon, Point ou MultiPolygon")
        if "coordinates" not in v:
            raise ValueError("Geometry deve ter campo 'coordinates'")
        return v


class SpectralIndices(BaseModel):
    """Valores dos índices espectrais."""
    ndvi: float = Field(..., description="Normalized Difference Vegetation Index")
    ndbi: float = Field(..., description="Normalized Difference Built-up Index")
    bsi: float = Field(..., description="Bare Soil Index")
    nbr: float = Field(..., description="Normalized Burn Ratio")


class TimeSeriesPoint(BaseModel):
    """Ponto na série temporal."""
    date: str = Field(..., description="Data no formato YYYY-MM-DD")
    ndvi: float | None = None
    ndbi: float | None = None
    bsi: float | None = None
    nbr: float | None = None


class ClassificationResult(BaseModel):
    """Resultado da classificação de mudança."""
    change_type: ChangeType
    confidence: float = Field(..., ge=0, le=1)
    description: str
    alert_level: str = Field(..., description="critical, warning, info, success")


class GeeAnalysisResponse(BaseModel):
    """Schema de resposta para análise GEE."""

    id: int
    status: AnalysisStatus
    progress: int = Field(default=0, ge=0, le=100)

    # Metadados
    geometry: dict | None = None
    start_date: date | None = None
    end_date: date | None = None
    images_found: int = Field(default=0, description="Número de imagens encontradas")

    # Resultados
    classification: ClassificationResult | None = None
    indices_start: SpectralIndices | None = None
    indices_end: SpectralIndices | None = None
    deltas: SpectralIndices | None = None
    time_series: list[TimeSeriesPoint] | None = None

    # Visualização
    tile_url_before: str | None = None
    tile_url_after: str | None = None

    # IA
    ai_analysis: str | None = None

    # Timestamps
    created_at: datetime | None = None
    completed_at: datetime | None = None

    # Erro (se houver)
    error_message: str | None = None

    class Config:
        from_attributes = True


class GeeAnalysisList(BaseModel):
    """Lista de análises."""
    items: list[GeeAnalysisResponse]
    total: int
    page: int
    page_size: int
