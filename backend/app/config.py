from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # API
    PROJECT_NAME: str = "Change Detector API"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Database
    DATABASE_URL: str = "postgresql://hackathon:hackathon123@localhost:5432/hackathon"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # MinIO Configuration
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ROOT_USER: str = "minioadmin"
    MINIO_ROOT_PASSWORD: str = "minioadmin123"
    MINIO_BUCKET: str = "hackathon"
    MINIO_SECURE: bool = False
    MINIO_PRESIGNED_EXPIRY: int = 3600

    # Celery Configuration
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    CELERY_TASK_TIME_LIMIT: int = 3600  # 1 hour
    CELERY_TASK_SOFT_TIME_LIMIT: int = 3300  # 55 min

    # Upload Configuration
    MAX_UPLOAD_SIZE: int = 500 * 1024 * 1024  # 500MB
    UPLOAD_TEMP_DIR: str = "/tmp/hackathon_uploads"
    UPLOAD_DIR: str = "/tmp/hackathon_uploads"  # Alias for satellite service

    # Google Earth Engine
    GEE_PROJECT_ID: str = "ee-hackathon5"
    GEE_SERVICE_ACCOUNT_KEY: str = ""  # Path to service account JSON or empty for personal auth

    # Copernicus Data Space / Sentinel Hub (free access)
    # Register at: https://dataspace.copernicus.eu/
    COPERNICUS_CLIENT_ID: str = ""
    COPERNICUS_CLIENT_SECRET: str = ""

    # Sentinel Hub Commercial (alternative)
    SH_CLIENT_ID: str = ""
    SH_CLIENT_SECRET: str = ""

    # Satellite data source: "earth_engine" or "sentinel_hub"
    SATELLITE_SOURCE: str = "earth_engine"

    # OpenRouter (LLM)
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "google/gemini-3-flash-preview"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignora variáveis extras do .env


settings = Settings()
