from fastapi import APIRouter, HTTPException

from app.api.v1.endpoints.analysis import analyses_db, changes_db
from app.schemas.analysis import AnalysisStatus
from app.schemas.change import ChangesGeoJSON, ChangeSummary

router = APIRouter()


@router.get("/{analysis_id}", response_model=ChangesGeoJSON)
async def get_changes(analysis_id: str):
    """Obter mudanças detectadas em formato GeoJSON."""
    if analysis_id not in analyses_db:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    analysis = analyses_db[analysis_id]
    if analysis["status"] != AnalysisStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail=f"Análise ainda não concluída. Status: {analysis['status']}",
        )

    changes = changes_db.get(analysis_id, [])

    # Converter para GeoJSON FeatureCollection
    features = []
    for change in changes:
        feature = {
            "type": "Feature",
            "id": change.get("id"),
            "properties": {
                "type": change.get("type", "unknown"),
                "area": change.get("area", 0),
                "confidence": change.get("confidence", 0),
            },
            "geometry": change.get("geometry", {}),
        }
        features.append(feature)

    return ChangesGeoJSON(
        type="FeatureCollection",
        features=features,
        metadata={
            "analysis_id": analysis_id,
            "total_changes": len(features),
            "image_before_id": analysis["image_before_id"],
            "image_after_id": analysis["image_after_id"],
        },
    )


@router.get("/{analysis_id}/summary", response_model=ChangeSummary)
async def get_changes_summary(analysis_id: str):
    """Obter resumo das mudanças detectadas."""
    if analysis_id not in analyses_db:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    analysis = analyses_db[analysis_id]
    changes = changes_db.get(analysis_id, [])

    # Agrupar por tipo
    by_type: dict[str, int] = {}
    total_area = 0.0

    for change in changes:
        change_type = change.get("type", "unknown")
        by_type[change_type] = by_type.get(change_type, 0) + 1
        total_area += change.get("area", 0)

    return ChangeSummary(
        analysis_id=analysis_id,
        total_changes=len(changes),
        total_area=total_area,
        by_type=by_type,
    )
