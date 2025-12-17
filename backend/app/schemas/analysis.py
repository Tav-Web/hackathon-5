from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class AnalysisStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class AnalysisCreate(BaseModel):
    image_before_id: int
    image_after_id: int
    threshold: float = 0.3
    min_area: float = 100.0


class AnalysisResponse(BaseModel):
    id: int
    image_before_id: int
    image_after_id: int
    status: AnalysisStatus
    threshold: float
    min_area: float
    created_at: datetime
    completed_at: datetime | None = None
    total_changes: int = 0
    total_area_changed: float = 0.0

    class Config:
        from_attributes = True


class AnalysisStatusResponse(BaseModel):
    id: int
    status: AnalysisStatus
    progress: int = 0
    message: str | None = None


class AnalysisResultResponse(BaseModel):
    id: int
    status: AnalysisStatus
    total_changes: int
    total_area_changed: float
    results_geojson: dict | None = None

    class Config:
        from_attributes = True
