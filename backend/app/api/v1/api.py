from fastapi import APIRouter
from app.api.v1.routers import accounts, auth, files, operations, sharing, trash, uploads

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(auth.router)
api_v1_router.include_router(accounts.router)
api_v1_router.include_router(files.router)
api_v1_router.include_router(uploads.router)
api_v1_router.include_router(operations.router)
api_v1_router.include_router(trash.router)
api_v1_router.include_router(sharing.router)
