import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.config import settings
from app.db.base import Base
from app.db.session import engine

# Import models to register them with SQLAlchemy
from app.models import Analysis, SatelliteImage, GeeAnalysis  # noqa: F401

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up...")

    # Create database tables
    try:
        Base.metadata.create_all(bind=engine, checkfirst=True)
        logger.info("Database tables created")
    except Exception as e:
        logger.warning(f"Tables may already exist: {e}")

    # Create upload temp directory
    upload_path = Path(settings.UPLOAD_TEMP_DIR)
    upload_path.mkdir(parents=True, exist_ok=True)

    # Initialize MinIO bucket
    try:
        from app.services.storage_service import ensure_bucket_exists

        ensure_bucket_exists()
        logger.info("Storage bucket initialized")
    except Exception as e:
        logger.warning(f"Could not initialize storage bucket: {e}")

    yield

    # Shutdown
    logger.info("Shutting down...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "environment": settings.ENVIRONMENT}
