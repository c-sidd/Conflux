from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.operation import AuditEvent, FileOperation, OperationItem, UploadReservation


class OperationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_operation(
        self,
        user_id: str,
        operation_type: str,
        source_account_id: Optional[str] = None,
        destination_account_id: Optional[str] = None,
        source_file_id: Optional[str] = None,
        destination_file_id: Optional[str] = None,
        requested_options: Optional[str] = None,
        idempotency_key: Optional[str] = None,
        correlation_id: Optional[str] = None,
        progress_total: Optional[int] = 0,
        progress_unit: str = "BYTES"
    ) -> FileOperation:
        op = FileOperation(
            user_id=user_id,
            operation_type=operation_type,
            status="QUEUED",
            source_account_id=source_account_id,
            destination_account_id=destination_account_id,
            source_file_id=source_file_id,
            destination_file_id=destination_file_id,
            requested_options=requested_options,
            idempotency_key=idempotency_key,
            correlation_id=correlation_id,
            progress_total=progress_total,
            progress_unit=progress_unit,
        )
        self.db.add(op)
        await self.db.commit()
        await self.db.refresh(op)
        return op

    async def get_by_id(self, operation_id: str, user_id: str) -> Optional[FileOperation]:
        stmt = (
            select(FileOperation)
            .where(
                FileOperation.id == operation_id,
                FileOperation.user_id == user_id
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_idempotency_key(self, idempotency_key: str, user_id: str) -> Optional[FileOperation]:
        stmt = (
            select(FileOperation)
            .where(
                FileOperation.idempotency_key == idempotency_key,
                FileOperation.user_id == user_id
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_user(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[FileOperation], int]:
        stmt = (
            select(FileOperation)
            .where(FileOperation.user_id == user_id)
            .order_by(FileOperation.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        count_stmt = select(func.count(FileOperation.id)).where(FileOperation.user_id == user_id)

        result = await self.db.execute(stmt)
        count_res = await self.db.execute(count_stmt)
        return list(result.scalars().all()), (count_res.scalar() or 0)

    async def update_status(
        self,
        operation_id: str,
        user_id: str,
        status: str,
        progress_current: Optional[int] = None,
        safe_error_code: Optional[str] = None,
        safe_error_message: Optional[str] = None
    ) -> None:
        values: Dict[str, Any] = {
            "status": status,
            "updated_at": datetime.now(timezone.utc)
        }
        if progress_current is not None:
            values["progress_current"] = progress_current
        if safe_error_code is not None:
            values["safe_error_code"] = safe_error_code
        if safe_error_message is not None:
            values["safe_error_message"] = safe_error_message

        if status == "RUNNING":
            values["started_at"] = datetime.now(timezone.utc)
        elif status in ("COMPLETED", "FAILED", "CANCELLED", "PARTIAL"):
            values["finished_at"] = datetime.now(timezone.utc)
        elif status == "AWAITING_CONFIRMATION":
            values["confirmation_requested_at"] = datetime.now(timezone.utc)

        stmt = (
            update(FileOperation)
            .where(
                FileOperation.id == operation_id,
                FileOperation.user_id == user_id
            )
            .values(**values)
        )
        await self.db.execute(stmt)
        await self.db.commit()

    async def mark_confirmed(self, operation_id: str, user_id: str) -> None:
        stmt = (
            update(FileOperation)
            .where(
                FileOperation.id == operation_id,
                FileOperation.user_id == user_id
            )
            .values(
                confirmed_at=datetime.now(timezone.utc),
                status="RUNNING",
                updated_at=datetime.now(timezone.utc)
            )
        )
        await self.db.execute(stmt)
        await self.db.commit()

    # Upload Reservation methods
    async def create_reservation(
        self,
        user_id: str,
        connected_account_id: str,
        operation_id: str,
        estimated_bytes: int,
        expiry_minutes: int = 60
    ) -> UploadReservation:
        res = UploadReservation(
            user_id=user_id,
            connected_account_id=connected_account_id,
            operation_id=operation_id,
            estimated_bytes=estimated_bytes,
            state="ACTIVE",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=expiry_minutes),
        )
        self.db.add(res)
        await self.db.commit()
        await self.db.refresh(res)
        return res

    async def get_active_reserved_bytes(self, connected_account_id: str) -> int:
        now = datetime.now(timezone.utc)
        stmt = (
            select(func.coalesce(func.sum(UploadReservation.estimated_bytes), 0))
            .where(
                UploadReservation.connected_account_id == connected_account_id,
                UploadReservation.state == "ACTIVE",
                UploadReservation.expires_at > now
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar() or 0

    async def release_reservation(self, operation_id: str) -> None:
        stmt = (
            update(UploadReservation)
            .where(UploadReservation.operation_id == operation_id)
            .values(
                state="RELEASED",
                released_at=datetime.now(timezone.utc)
            )
        )
        await self.db.execute(stmt)
        await self.db.commit()

    # Audit Events
    async def record_audit_event(
        self,
        user_id: Optional[str],
        event_type: str,
        outcome: str,
        connected_account_id: Optional[str] = None,
        operation_id: Optional[str] = None,
        metadata_json: Optional[str] = None
    ) -> None:
        event = AuditEvent(
            user_id=user_id,
            event_type=event_type,
            outcome=outcome,
            connected_account_id=connected_account_id,
            operation_id=operation_id,
            metadata_json=metadata_json
        )
        self.db.add(event)
        await self.db.commit()
