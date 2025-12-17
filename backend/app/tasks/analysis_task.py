"""Celery task for change detection analysis."""

import logging
import tempfile
from datetime import datetime
from pathlib import Path

from celery import shared_task

from app.celery_app import celery_app
from app.config import settings
from app.core.detection.change_detector import detect_changes
from app.db.session import SessionLocal
from app.models.analysis import Analysis, AnalysisStatus
from app.models.satellite_image import SatelliteImage
from app.services.storage_service import download_file

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3)
def process_analysis_task(self, analysis_id: int) -> dict:
    """Process a change detection analysis.

    Args:
        analysis_id: ID of the analysis to process.

    Returns:
        Dictionary with results summary.
    """
    db = SessionLocal()
    temp_dir = None

    try:
        # Get analysis from database
        analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
        if not analysis:
            logger.error(f"Analysis {analysis_id} not found")
            return {"error": "Analysis not found"}

        # Update status to processing
        analysis.status = AnalysisStatus.PROCESSING
        analysis.progress = 10
        db.commit()

        # Get images
        image_before = (
            db.query(SatelliteImage)
            .filter(SatelliteImage.id == analysis.image_before_id)
            .first()
        )
        image_after = (
            db.query(SatelliteImage)
            .filter(SatelliteImage.id == analysis.image_after_id)
            .first()
        )

        if not image_before or not image_after:
            raise ValueError("Images not found")

        # Create temp directory for downloaded files
        temp_dir = tempfile.mkdtemp(prefix="analysis_")
        before_path = Path(temp_dir) / "before.tif"
        after_path = Path(temp_dir) / "after.tif"

        # Download images from storage
        analysis.progress = 20
        db.commit()

        download_file(image_before.storage_path, str(before_path))
        analysis.progress = 30
        db.commit()

        download_file(image_after.storage_path, str(after_path))
        analysis.progress = 40
        db.commit()

        # Run change detection
        analysis.progress = 50
        db.commit()

        # Get bounds for geo-referencing if available
        bounds = None
        if image_before.bounds:
            # Extract bounds from geometry - simplified for now
            bounds = {
                "minx": image_before.center_lon - 0.01 if image_before.center_lon else 0,
                "miny": image_before.center_lat - 0.01 if image_before.center_lat else 0,
                "maxx": image_before.center_lon + 0.01 if image_before.center_lon else 1,
                "maxy": image_before.center_lat + 0.01 if image_before.center_lat else 1,
            }

        import asyncio

        changes = asyncio.run(
            detect_changes(
                str(before_path),
                str(after_path),
                threshold=analysis.threshold,
                min_area=int(analysis.min_area),
            )
        )

        analysis.progress = 90
        db.commit()

        # Create GeoJSON result
        geojson_result = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "id": change["id"],
                    "properties": {
                        "type": change["type"],
                        "area": change["area"],
                        "confidence": change["confidence"],
                    },
                    "geometry": change["geometry"],
                }
                for change in changes
            ],
            "metadata": {
                "analysis_id": analysis_id,
                "total_changes": len(changes),
                "image_before_id": analysis.image_before_id,
                "image_after_id": analysis.image_after_id,
            },
        }

        # Update analysis with results
        analysis.status = AnalysisStatus.COMPLETED
        analysis.progress = 100
        analysis.total_changes = len(changes)
        analysis.total_area_changed = sum(c.get("area", 0) for c in changes)
        analysis.results_geojson = geojson_result
        analysis.completed_at = datetime.utcnow()
        db.commit()

        logger.info(f"Analysis {analysis_id} completed with {len(changes)} changes")

        return {
            "analysis_id": analysis_id,
            "status": "completed",
            "total_changes": len(changes),
            "total_area_changed": analysis.total_area_changed,
        }

    except Exception as e:
        logger.error(f"Analysis {analysis_id} failed: {e}")
        if db:
            analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
            if analysis:
                analysis.status = AnalysisStatus.FAILED
                analysis.error_message = str(e)
                db.commit()
        raise self.retry(exc=e, countdown=60)

    finally:
        db.close()
        # Clean up temp files
        if temp_dir:
            import shutil

            shutil.rmtree(temp_dir, ignore_errors=True)
