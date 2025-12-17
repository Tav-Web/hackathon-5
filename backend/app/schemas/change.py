from enum import Enum
from typing import Any

from pydantic import BaseModel


class ChangeType(str, Enum):
    CONSTRUCTION = "construction"
    DEMOLITION = "demolition"
    DEFORESTATION = "deforestation"
    VEGETATION_GROWTH = "vegetation_growth"
    SOIL_MOVEMENT = "soil_movement"
    DEBRIS = "debris"
    URBAN_EXPANSION = "urban_expansion"
    UNKNOWN = "unknown"


class ChangeFeature(BaseModel):
    id: str
    type: ChangeType
    area: float
    centroid: tuple[float, float]
    confidence: float
    geometry: dict[str, Any]  # GeoJSON geometry


class ChangesGeoJSON(BaseModel):
    type: str = "FeatureCollection"
    features: list[dict[str, Any]]
    metadata: dict[str, Any] | None = None


class ChangeSummary(BaseModel):
    analysis_id: str
    total_changes: int
    total_area: float
    by_type: dict[str, int]
    bounds: dict[str, float] | None = None
