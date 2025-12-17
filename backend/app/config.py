from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # API
    PROJECT_NAME: str = "Change Detector API"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Upload
    MAX_UPLOAD_SIZE: int = 100 * 1024 * 1024  # 100MB
    UPLOAD_DIR: str = "uploads"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignora variáveis extras do .env


settings = Settings()
