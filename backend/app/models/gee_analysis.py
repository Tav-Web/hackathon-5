"""
Modelo SQLAlchemy para análises via Google Earth Engine.
"""

from datetime import date, datetime
from typing import TYPE_CHECKING

from geoalchemy2 import Geometry
from sqlalchemy import JSON, Date, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

if TYPE_CHECKING:
    pass


class GeeAnalysis(Base):
    """Modelo para armazenar análises do Google Earth Engine."""

    __tablename__ = "gee_analyses"

    # Identificação
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Geometria da área analisada
    geometry: Mapped[dict] = mapped_column(JSON, nullable=False)
    geometry_geom = mapped_column(
        Geometry(geometry_type="GEOMETRY", srid=4326),
        nullable=True,
        comment="Geometria para consultas espaciais"
    )

    # Período de análise
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    cloud_tolerance: Mapped[int] = mapped_column(Integer, default=20)

    # Status
    status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        comment="pending, processing, completed, failed"
    )
    progress: Mapped[int] = mapped_column(Integer, default=0)

    # Metadados
    images_found: Mapped[int] = mapped_column(Integer, default=0)

    # Índices espectrais - início do período
    ndvi_start: Mapped[float | None] = mapped_column(Float, nullable=True)
    ndbi_start: Mapped[float | None] = mapped_column(Float, nullable=True)
    bsi_start: Mapped[float | None] = mapped_column(Float, nullable=True)
    nbr_start: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Índices espectrais - fim do período
    ndvi_end: Mapped[float | None] = mapped_column(Float, nullable=True)
    ndbi_end: Mapped[float | None] = mapped_column(Float, nullable=True)
    bsi_end: Mapped[float | None] = mapped_column(Float, nullable=True)
    nbr_end: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Deltas (variações)
    delta_ndvi: Mapped[float | None] = mapped_column(Float, nullable=True)
    delta_ndbi: Mapped[float | None] = mapped_column(Float, nullable=True)
    delta_bsi: Mapped[float | None] = mapped_column(Float, nullable=True)
    delta_nbr: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Classificação
    classification: Mapped[str | None] = mapped_column(String(50), nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    alert_level: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Série temporal (JSON array)
    time_series: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # URLs de tiles para visualização
    tile_url_before: Mapped[str | None] = mapped_column(Text, nullable=True)
    tile_url_after: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Análise da IA
    ai_analysis: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Erro (se houver)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    def to_response_dict(self) -> dict:
        """Converte para dicionário de resposta."""
        return {
            "id": self.id,
            "status": self.status,
            "progress": self.progress,
            "geometry": self.geometry,
            "start_date": self.start_date,
            "end_date": self.end_date,
            "images_found": self.images_found,
            "classification": {
                "change_type": self.classification,
                "confidence": self.confidence,
                "alert_level": self.alert_level,
                "description": "",  # Será preenchido pelo serviço
            } if self.classification else None,
            "indices_start": {
                "ndvi": self.ndvi_start,
                "ndbi": self.ndbi_start,
                "bsi": self.bsi_start,
                "nbr": self.nbr_start,
            } if self.ndvi_start is not None else None,
            "indices_end": {
                "ndvi": self.ndvi_end,
                "ndbi": self.ndbi_end,
                "bsi": self.bsi_end,
                "nbr": self.nbr_end,
            } if self.ndvi_end is not None else None,
            "deltas": {
                "ndvi": self.delta_ndvi,
                "ndbi": self.delta_ndbi,
                "bsi": self.delta_bsi,
                "nbr": self.delta_nbr,
            } if self.delta_ndvi is not None else None,
            "time_series": self.time_series,
            "tile_url_before": self.tile_url_before,
            "tile_url_after": self.tile_url_after,
            "ai_analysis": self.ai_analysis,
            "created_at": self.created_at,
            "completed_at": self.completed_at,
            "error_message": self.error_message,
        }
