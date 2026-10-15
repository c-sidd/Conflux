from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.account import ConnectedAccount, SyncState


class AccountRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, account_id: str, user_id: str) -> Optional[ConnectedAccount]:
        """Tenant-scoped lookup ensuring account belongs to authenticated user."""
        stmt = (
            select(ConnectedAccount)
            .where(
                ConnectedAccount.id == account_id,
                ConnectedAccount.user_id == user_id
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_user(self, user_id: str) -> List[ConnectedAccount]:
        """Lists all connected accounts for the user, excluding disconnected ones."""
        stmt = (
            select(ConnectedAccount)
            .where(
                ConnectedAccount.user_id == user_id,
                ConnectedAccount.connection_status != "DISCONNECTED"
            )
            .order_by(ConnectedAccount.created_at.asc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_by_provider_id(
        self,
        user_id: str,
        provider: str,
        provider_account_id: str
    ) -> Optional[ConnectedAccount]:
        stmt = (
            select(ConnectedAccount)
            .where(
                ConnectedAccount.user_id == user_id,
                ConnectedAccount.provider == provider,
                ConnectedAccount.provider_account_id == provider_account_id
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_or_reconnect(
        self,
        user_id: str,
        provider: str,
        provider_account_id: str,
        email: Optional[str],
        display_name: Optional[str],
        encrypted_refresh_token: str,
        granted_scopes: str,
    ) -> ConnectedAccount:
        existing = await self.get_by_provider_id(user_id, provider, provider_account_id)
        if existing:
            existing.email = email
            existing.display_name = display_name
            existing.encrypted_refresh_token = encrypted_refresh_token
            existing.granted_scopes = granted_scopes
            existing.connection_status = "CONNECTED"
            existing.disconnected_at = None
            existing.updated_at = datetime.now(timezone.utc)
            await self.db.commit()
            await self.db.refresh(existing)
            return existing

        account = ConnectedAccount(
            user_id=user_id,
            provider=provider,
            provider_account_id=provider_account_id,
            email=email,
            display_name=display_name,
            encrypted_refresh_token=encrypted_refresh_token,
            granted_scopes=granted_scopes,
            connection_status="CONNECTED",
        )
        self.db.add(account)
        await self.db.commit()
        await self.db.refresh(account)
        return account

    async def update_quota(
        self,
        account_id: str,
        user_id: str,
        total_bytes: Optional[int],
        used_bytes: Optional[int],
        source: str = "GOOGLE_DRIVE"
    ) -> None:
        stmt = (
            update(ConnectedAccount)
            .where(
                ConnectedAccount.id == account_id,
                ConnectedAccount.user_id == user_id
            )
            .values(
                quota_total_bytes=total_bytes,
                quota_used_bytes=used_bytes,
                quota_observed_at=datetime.now(timezone.utc),
                quota_source=source,
                updated_at=datetime.now(timezone.utc)
            )
        )
        await self.db.execute(stmt)
        await self.db.commit()

    async def update_status(
        self,
        account_id: str,
        user_id: str,
        status: str,
        error_code: Optional[str] = None
    ) -> None:
        stmt = (
            update(ConnectedAccount)
            .where(
                ConnectedAccount.id == account_id,
                ConnectedAccount.user_id == user_id
            )
            .values(
                connection_status=status,
                last_error_code=error_code,
                updated_at=datetime.now(timezone.utc)
            )
        )
        await self.db.execute(stmt)
        await self.db.commit()

    async def disconnect(self, account_id: str, user_id: str) -> bool:
        stmt = (
            update(ConnectedAccount)
            .where(
                ConnectedAccount.id == account_id,
                ConnectedAccount.user_id == user_id
            )
            .values(
                connection_status="DISCONNECTED",
                disconnected_at=datetime.now(timezone.utc),
                encrypted_refresh_token=None,  # Zero out token material immediately
                updated_at=datetime.now(timezone.utc)
            )
        )
        result = await self.db.execute(stmt)
        await self.db.commit()
        return result.rowcount > 0

    # SyncState methods
    async def get_or_create_sync_state(self, account_id: str) -> SyncState:
        stmt = select(SyncState).where(SyncState.connected_account_id == account_id)
        result = await self.db.execute(stmt)
        sync_state = result.scalar_one_or_none()
        if not sync_state:
            sync_state = SyncState(
                connected_account_id=account_id,
                initial_sync_status="PENDING"
            )
            self.db.add(sync_state)
            await self.db.commit()
            await self.db.refresh(sync_state)
        return sync_state

    async def update_sync_cursor(
        self,
        account_id: str,
        cursor: str,
        success: bool = True,
        error_code: Optional[str] = None
    ) -> None:
        values = {
            "change_cursor": cursor,
            "last_error_code": error_code,
            "updated_at": datetime.now(timezone.utc)
        }
        if success:
            values["last_success_at"] = datetime.now(timezone.utc)
            values["initial_sync_status"] = "COMPLETED"

        stmt = (
            update(SyncState)
            .where(SyncState.connected_account_id == account_id)
            .values(**values)
        )
        await self.db.execute(stmt)
        await self.db.commit()
