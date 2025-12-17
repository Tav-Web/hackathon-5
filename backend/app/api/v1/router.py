from fastapi import APIRouter

from app.api.v1.endpoints import analysis, changes, images, satellite
from app.api.v1.endpoints import analysis, changes, chat, gee, images

api_router = APIRouter()

api_router.include_router(images.router, prefix="/images", tags=["images"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
api_router.include_router(changes.router, prefix="/changes", tags=["changes"])
api_router.include_router(satellite.router, prefix="/satellite", tags=["satellite"])
api_router.include_router(gee.router, prefix="/gee", tags=["gee"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
