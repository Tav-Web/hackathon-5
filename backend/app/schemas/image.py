from datetime import datetime

from pydantic import BaseModel


class ImageBase(BaseModel):
    filename: str
    capture_date: datetime | None = None


class ImageCreate(ImageBase):
    pass


class ImageResponse(ImageBase):
    id: str
    filepath: str
    width: int
    height: int
    bounds: dict | None = None
    crs: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class ImageUploadResponse(BaseModel):
    id: str
    filename: str
    message: str
