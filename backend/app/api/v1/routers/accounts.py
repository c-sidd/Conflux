from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies.auth import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.account import (
    ConnectedAccountResponse,
    GoogleAuthorizeResponse,
    QuotaSnapshot,
    SyncAccountResponse,
)
from app.services.account_service import AccountService
from app.services.sync_service import SyncService

router = APIRouter(prefix="/accounts", tags=["Connected Accounts"])


@router.get("", response_model=List[ConnectedAccountResponse])
async def list_connected_accounts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = AccountService(db)
    return await service.list_accounts(current_user.id)


@router.post("/google/authorize", response_model=GoogleAuthorizeResponse)
async def authorize_google_account(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = AccountService(db)
    data = service.get_authorization_url(current_user.id)
    response.set_cookie(
        key="conflux_oauth_nonce",
        value=data["nonce"],
        httponly=True,
        secure=settings.APP_ENV == "production",
        samesite="lax",
        max_age=600,
        path="/"
    )
    return GoogleAuthorizeResponse(
        authorization_url=data["authorization_url"],
        state=data["state"]
    )


@router.get("/google/callback")
async def google_oauth_callback(
    request: Request,
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    expected_nonce = request.cookies.get("conflux_oauth_nonce")
    service = AccountService(db)
    account = await service.handle_oauth_callback(code=code, state=state, expected_nonce=expected_nonce)

    # Initial sync
    sync_service = SyncService(db)
    await sync_service.sync_account(account.id, account.user_id)

    # Redirect user to the frontend accounts view and delete cookie
    redirect_resp = RedirectResponse(url=f"{settings.PUBLIC_APP_URL}/accounts?connected={account.id}")
    redirect_resp.delete_cookie(key="conflux_oauth_nonce", path="/")
    return redirect_resp


@router.get("/{account_id}", response_model=ConnectedAccountResponse)
async def get_account_details(
    account_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = AccountService(db)
    return await service.get_account(account_id, current_user.id)


@router.post("/{account_id}/sync", response_model=SyncAccountResponse, status_code=status.HTTP_202_ACCEPTED)
async def sync_account(
    account_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    sync_service = SyncService(db)
    result = await sync_service.sync_account(account_id, current_user.id)
    return SyncAccountResponse(
        operation_id=f"sync-{account_id}",
        status=result.get("status", "SUCCESS"),
        message=f"Sync executed: {result.get('mode', 'SYNC')}"
    )


@router.post("/{account_id}/refresh-quota", response_model=QuotaSnapshot)
async def refresh_account_quota(
    account_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = AccountService(db)
    return await service.refresh_quota(account_id, current_user.id)


@router.delete("/{account_id}", status_code=status.HTTP_200_OK)
async def disconnect_account(
    account_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = AccountService(db)
    await service.disconnect_account(account_id, current_user.id)
    return {"message": "Account disconnected safely"}
