from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class AnalysisStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class AnalysisCreate(BaseModel):
    image_before_id: str
    image_after_id: str
    threshold: float = 0.3
    min_area: int = 100


class AnalysisResponse(BaseModel):
    id: str
    image_before_id: str
    image_after_id: str
    status: AnalysisStatus
    created_at: datetime
    completed_at: datetime | None = None
    total_changes: int = 0
    total_area_changed: float = 0.0

    class Config:
        from_attributes = True


class AnalysisStatusResponse(BaseModel):
    id: str
    status: AnalysisStatus
    progress: int = 0
    message: str | None = None
