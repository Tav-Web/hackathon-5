"""Analysis model for storing change detection analyses."""

import enum
from datetime import datetime
from typing import TYPE_CHECKING

from geoalchemy2 import Geometry
from sqlalchemy import DateTime, Enum, Float, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.satellite_image import SatelliteImage


class AnalysisStatus(str, enum.Enum):
    """Status of an analysis."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Analysis(Base):
    """Model for change detection analyses."""

    __tablename__ = "analyses"
    __table_args__ = (
        Index("idx_analyses_status", "status"),
        Index("idx_analyses_created_at", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    # Image references
    image_before_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("satellite_images.id"), nullable=False
    )
    image_after_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("satellite_images.id"), nullable=False
    )

    # Analysis parameters
    threshold: Mapped[float] = mapped_column(Float, nullable=False, default=0.3)
    min_area: Mapped[float] = mapped_column(Float, nullable=False, default=100.0)
    roi: Mapped[bytes | None] = mapped_column(
        Geometry(geometry_type="POLYGON", srid=4326)
    )  # Region of Interest

    # Status
    status: Mapped[AnalysisStatus] = mapped_column(
        Enum(AnalysisStatus), nullable=False, default=AnalysisStatus.PENDING
    )
    progress: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_message: Mapped[str | None] = mapped_column(Text)

    # Results
    total_changes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_area_changed: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    results_geojson: Mapped[dict | None] = mapped_column(JSONB)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)

    # Relationships
    image_before: Mapped["SatelliteImage"] = relationship(
        back_populates="analyses_before",
        foreign_keys=[image_before_id],
    )
    image_after: Mapped["SatelliteImage"] = relationship(
        back_populates="analyses_after",
        foreign_keys=[image_after_id],
    )
