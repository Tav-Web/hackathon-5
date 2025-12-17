"""SatelliteImage model for storing uploaded satellite images."""

from datetime import datetime
from typing import TYPE_CHECKING

from geoalchemy2 import Geometry
from sqlalchemy import DateTime, Float, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.analysis import Analysis


class SatelliteImage(Base):
    """Model for satellite images."""

    __tablename__ = "satellite_images"
    __table_args__ = (
        Index("idx_satellite_images_bounds", "bounds", postgresql_using="gist"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    capture_date: Mapped[datetime | None] = mapped_column(DateTime)

    # Image metadata
    width: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    height: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Geospatial data
    bounds: Mapped[bytes | None] = mapped_column(
        Geometry(geometry_type="POLYGON", srid=4326)
    )
    center_lat: Mapped[float | None] = mapped_column(Float)
    center_lon: Mapped[float | None] = mapped_column(Float)
    crs: Mapped[str | None] = mapped_column(String(50))

    # Processing status
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending"
    )  # pending, processing, ready, error
    error_message: Mapped[str | None] = mapped_column(Text)

    # Additional metadata
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    analyses_before: Mapped[list["Analysis"]] = relationship(
        back_populates="image_before",
        foreign_keys="Analysis.image_before_id",
    )
    analyses_after: Mapped[list["Analysis"]] = relationship(
        back_populates="image_after",
        foreign_keys="Analysis.image_after_id",
    )
