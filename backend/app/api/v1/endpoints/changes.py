"""Changes endpoint for retrieving detected changes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.analysis import Analysis
from app.models.analysis import AnalysisStatus as DBAnalysisStatus
from app.schemas.change import ChangesGeoJSON, ChangeSummary

router = APIRouter()


@router.get("/{analysis_id}", response_model=ChangesGeoJSON)
async def get_changes(analysis_id: int, db: Session = Depends(get_db)):
    """Get detected changes as GeoJSON."""
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    if analysis.status != DBAnalysisStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail=f"Análise ainda não concluída. Status: {analysis.status.value}",
        )

    # Return the stored GeoJSON result
    if analysis.results_geojson:
        return ChangesGeoJSON(
            type=analysis.results_geojson.get("type", "FeatureCollection"),
            features=analysis.results_geojson.get("features", []),
            metadata=analysis.results_geojson.get("metadata"),
        )

    return ChangesGeoJSON(
        type="FeatureCollection",
        features=[],
        metadata={
            "analysis_id": analysis_id,
            "total_changes": 0,
            "image_before_id": analysis.image_before_id,
            "image_after_id": analysis.image_after_id,
        },
    )


@router.get("/{analysis_id}/summary", response_model=ChangeSummary)
async def get_changes_summary(analysis_id: int, db: Session = Depends(get_db)):
    """Get summary of detected changes."""
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    # Group by type
    by_type: dict[str, int] = {}
    total_area = 0.0

    if analysis.results_geojson and "features" in analysis.results_geojson:
        for feature in analysis.results_geojson["features"]:
            props = feature.get("properties", {})
            change_type = props.get("type", "unknown")
            by_type[change_type] = by_type.get(change_type, 0) + 1
            total_area += props.get("area", 0)

    return ChangeSummary(
        analysis_id=analysis_id,
        total_changes=analysis.total_changes,
        total_area=analysis.total_area_changed,
        by_type=by_type,
    )
