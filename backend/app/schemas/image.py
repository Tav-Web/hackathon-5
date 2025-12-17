from datetime import datetime

from pydantic import BaseModel


class ImageBase(BaseModel):
    name: str | None = None
    capture_date: datetime | None = None


class ImageCreate(ImageBase):
    pass


class ImageResponse(BaseModel):
    id: int
    name: str
    original_filename: str
    width: int
    height: int
    file_size: int
    bounds: dict | None = None
    center_lat: float | None = None
    center_lon: float | None = None
    crs: str | None = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class ImageUploadResponse(BaseModel):
    id: int
    filename: str
    message: str


class ImageListResponse(BaseModel):
    id: int
    name: str
    original_filename: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
