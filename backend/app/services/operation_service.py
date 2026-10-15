import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.crypto import token_cipher
from app.core.errors import (
    ConflictException,
    PermissionDeniedException,
    QuotaInsufficientException,
    ResourceNotFoundException,
    UnsupportedCapabilityException,
)
from app.models.file import FileMetadata
from app.models.operation import FileOperation
from app.providers import get_storage_provider
from app.repositories.account_repo import AccountRepository
from app.repositories.file_repo import FileRepository
from app.repositories.operation_repo import OperationRepository
from app.schemas.operation import CreateUploadRequest, FileOperationResponse, UploadResponse
from app.services.placement_service import PlacementService


class OperationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = OperationRepository(db)
        self.file_repo = FileRepository(db)
        self.account_repo = AccountRepository(db)
        self.placement_service = PlacementService(db)
        self.provider = get_storage_provider()

    async def _get_credentials(self, account_id: str, user_id: str) -> Dict[str, Any]:
        acc = await self.account_repo.get_by_id(account_id, user_id)
        if not acc:
            raise ResourceNotFoundException("Connected account not found")
        credentials = {"email": acc.email}
        if acc.encrypted_refresh_token:
            try:
                decrypted = token_cipher.decrypt(json.loads(acc.encrypted_refresh_token))
                credentials["refresh_token"] = decrypted
            except Exception:
                pass
        return credentials

    async def initiate_upload(
        self,
        user_id: str,
        req: CreateUploadRequest,
        idempotency_key: Optional[str] = None
    ) -> UploadResponse:
        # Check idempotency
        if idempotency_key:
            existing = await self.repo.get_by_idempotency_key(idempotency_key, user_id)
            if existing:
                return UploadResponse(
                    operation_id=existing.id,
                    status=existing.status,
                    destination_account_id=existing.destination_account_id or "",
                    placement_type="CACHED",
                    placement_reason="Idempotent duplicate request",
                )

        # Best-fit placement
        decision = await self.placement_service.select_destination(
            user_id=user_id,
            file_size_bytes=req.size_bytes,
            manual_account_id=req.destination_account_id
        )

        options = json.dumps({
            "name": req.name,
            "mime_type": req.mime_type,
            "size_bytes": req.size_bytes,
            "parent_file_id": req.parent_file_id,
            "placement_type": decision.placement_type,
            "placement_reason": decision.reason,
        })

        # Create FileOperation record
        op = await self.repo.create_operation(
            user_id=user_id,
            operation_type="UPLOAD",
            destination_account_id=decision.account_id,
            requested_options=options,
            idempotency_key=idempotency_key,
            progress_total=req.size_bytes,
        )

        # Create UploadReservation to prevent concurrent overallocation
        if req.size_bytes > 0:
            await self.repo.create_reservation(
                user_id=user_id,
                connected_account_id=decision.account_id,
                operation_id=op.id,
                estimated_bytes=req.size_bytes
            )

        return UploadResponse(
            operation_id=op.id,
            status=op.status,
            destination_account_id=decision.account_id,
            destination_account_email=decision.account_email,
            placement_type=decision.placement_type,
            placement_reason=decision.reason,
            upload_url=f"/api/v1/uploads/{op.id}/complete",
        )

    async def complete_upload(
        self,
        operation_id: str,
        user_id: str,
        uploaded_bytes: bytes,
        filename: Optional[str] = None,
        mime_type: Optional[str] = None
    ) -> FileOperationResponse:
        op = await self.repo.get_by_id(operation_id, user_id)
        if not op:
            raise ResourceNotFoundException("Upload operation not found")

        options = json.loads(op.requested_options or "{}")
        file_name = filename or options.get("name", "uploaded_file")
        content_type = mime_type or options.get("mime_type", "application/octet-stream")
        parent_id = options.get("parent_file_id")

        await self.repo.update_status(operation_id, user_id, "RUNNING", progress_current=len(uploaded_bytes))

        creds = await self._get_credentials(op.destination_account_id, user_id)

        # Upload to Google Drive via provider adapter
        provider_meta = await self.provider.upload_file(
            credentials=creds,
            name=file_name,
            content=uploaded_bytes,
            mime_type=content_type,
            parent_id=parent_id
        )

        # Upsert local metadata index
        meta_dict = {
            "user_id": user_id,
            "connected_account_id": op.destination_account_id,
            "provider": "GOOGLE_DRIVE",
            "provider_file_id": provider_meta["id"],
            "name": provider_meta["name"],
            "mime_type": provider_meta["mimeType"],
            "parent_provider_file_id": parent_id or "root",
            "size_bytes": len(uploaded_bytes),
            "modified_time_provider": datetime.now(timezone.utc),
            "created_time_provider": datetime.now(timezone.utc),
            "trashed_provider": False,
            "is_folder": False,
            "capability_snapshot": json.dumps(provider_meta.get("capabilities", {})),
            "last_synced_at": datetime.now(timezone.utc),
        }
        file_record = await self.file_repo.upsert_metadata(meta_dict)

        # Release reservation
        await self.repo.release_reservation(operation_id)

        # Complete operation
        op.destination_file_id = file_record.id
        await self.repo.update_status(operation_id, user_id, "COMPLETED", progress_current=len(uploaded_bytes))

        return self._to_response_dto(op)

    async def initiate_copy(
        self,
        file_id: str,
        user_id: str,
        destination_account_id: Optional[str] = None,
        destination_parent_id: Optional[str] = None
    ) -> FileOperationResponse:
        file_res = await self.file_repo.get_by_id(file_id, user_id)
        if not file_res:
            raise ResourceNotFoundException("Source file not found")
        source_meta, _, _ = file_res

        target_acc_id = destination_account_id or source_meta.connected_account_id
        is_cross_account = (target_acc_id != source_meta.connected_account_id)

        op = await self.repo.create_operation(
            user_id=user_id,
            operation_type="COPY",
            source_account_id=source_meta.connected_account_id,
            destination_account_id=target_acc_id,
            source_file_id=source_meta.id,
            requested_options=json.dumps({"is_cross_account": is_cross_account}),
        )

        await self.repo.update_status(op.id, user_id, "RUNNING")

        source_creds = await self._get_credentials(source_meta.connected_account_id, user_id)
        dest_creds = await self._get_credentials(target_acc_id, user_id)

        if not is_cross_account:
            # Same-account provider copy
            copied_res = await self.provider.copy_file(
                source_creds,
                source_meta.provider_file_id,
                destination_parent_id=destination_parent_id,
                new_name=f"Copy of {source_meta.name}"
            )
            dest_provider_id = copied_res["id"]
        else:
            # Cross-account copy: stream bytes through provider
            content_chunks = []
            async for chunk in self.provider.download_file(source_creds, source_meta.provider_file_id):
                content_chunks.append(chunk)
            bytes_data = b"".join(content_chunks)

            copied_res = await self.provider.upload_file(
                dest_creds,
                name=f"Copy of {source_meta.name}",
                content=bytes_data,
                mime_type=source_meta.mime_type,
                parent_id=destination_parent_id
            )
            dest_provider_id = copied_res["id"]

        # Create destination metadata row
        dest_meta = await self.file_repo.upsert_metadata({
            "user_id": user_id,
            "connected_account_id": target_acc_id,
            "provider": "GOOGLE_DRIVE",
            "provider_file_id": dest_provider_id,
            "name": copied_res.get("name", f"Copy of {source_meta.name}"),
            "mime_type": copied_res.get("mimeType", source_meta.mime_type),
            "parent_provider_file_id": destination_parent_id or "root",
            "size_bytes": source_meta.size_bytes,
            "modified_time_provider": datetime.now(timezone.utc),
            "created_time_provider": datetime.now(timezone.utc),
            "trashed_provider": False,
            "is_folder": False,
            "capability_snapshot": json.dumps(copied_res.get("capabilities", {})),
            "last_synced_at": datetime.now(timezone.utc),
        })

        op.destination_file_id = dest_meta.id
        await self.repo.update_status(op.id, user_id, "COMPLETED")
        return self._to_response_dto(op)

    async def initiate_move(
        self,
        file_id: str,
        user_id: str,
        destination_account_id: Optional[str] = None,
        destination_parent_id: Optional[str] = None
    ) -> FileOperationResponse:
        file_res = await self.file_repo.get_by_id(file_id, user_id)
        if not file_res:
            raise ResourceNotFoundException("Source file not found")
        source_meta, _, _ = file_res

        target_acc_id = destination_account_id or source_meta.connected_account_id
        is_cross_account = (target_acc_id != source_meta.connected_account_id)

        if not is_cross_account:
            # Same account move: immediate parent update
            source_creds = await self._get_credentials(source_meta.connected_account_id, user_id)
            await self.provider.move_file(
                source_creds,
                source_meta.provider_file_id,
                new_parent_id=destination_parent_id or "root",
                old_parent_id=source_meta.parent_provider_file_id
            )
            source_meta.parent_provider_file_id = destination_parent_id or "root"
            await self.db.commit()

            op = await self.repo.create_operation(
                user_id=user_id,
                operation_type="MOVE",
                source_account_id=source_meta.connected_account_id,
                destination_account_id=source_meta.connected_account_id,
                source_file_id=source_meta.id,
            )
            await self.repo.update_status(op.id, user_id, "COMPLETED")
            return self._to_response_dto(op)

        # Cross-Account Move Safety Flow:
        # 1. Copy bytes to destination
        # 2. Verify destination created & accessible
        # 3. Transition to AWAITING_CONFIRMATION
        # 4. Require explicit user call to confirm source removal!
        op = await self.repo.create_operation(
            user_id=user_id,
            operation_type="CROSS_ACCOUNT_MOVE",
            source_account_id=source_meta.connected_account_id,
            destination_account_id=target_acc_id,
            source_file_id=source_meta.id,
        )

        await self.repo.update_status(op.id, user_id, "RUNNING")

        source_creds = await self._get_credentials(source_meta.connected_account_id, user_id)
        dest_creds = await self._get_credentials(target_acc_id, user_id)

        # Stream & Copy to destination
        content_chunks = []
        async for chunk in self.provider.download_file(source_creds, source_meta.provider_file_id):
            content_chunks.append(chunk)
        bytes_data = b"".join(content_chunks)

        copied_res = await self.provider.upload_file(
            dest_creds,
            name=source_meta.name,
            content=bytes_data,
            mime_type=source_meta.mime_type,
            parent_id=destination_parent_id
        )

        # Verify destination provider file exists
        verify_meta = await self.provider.get_file_metadata(dest_creds, copied_res["id"])
        if not verify_meta or verify_meta.get("id") != copied_res["id"]:
            await self.repo.update_status(op.id, user_id, "FAILED", safe_error_message="Destination verification failed")
            raise ConflictException("Failed to verify newly created file at destination account")

        # Save destination metadata
        dest_meta = await self.file_repo.upsert_metadata({
            "user_id": user_id,
            "connected_account_id": target_acc_id,
            "provider": "GOOGLE_DRIVE",
            "provider_file_id": copied_res["id"],
            "name": source_meta.name,
            "mime_type": source_meta.mime_type,
            "parent_provider_file_id": destination_parent_id or "root",
            "size_bytes": len(bytes_data),
            "modified_time_provider": datetime.now(timezone.utc),
            "created_time_provider": datetime.now(timezone.utc),
            "trashed_provider": False,
            "is_folder": False,
            "capability_snapshot": json.dumps(verify_meta.get("capabilities", {})),
            "last_synced_at": datetime.now(timezone.utc),
        })

        op.destination_file_id = dest_meta.id
        # State machine transition to AWAITING_CONFIRMATION!
        await self.repo.update_status(op.id, user_id, "AWAITING_CONFIRMATION")
        return self._to_response_dto(op)

    async def confirm_source_removal(self, operation_id: str, user_id: str) -> FileOperationResponse:
        op = await self.repo.get_by_id(operation_id, user_id)
        if not op:
            raise ResourceNotFoundException("Operation not found")

        if op.status != "AWAITING_CONFIRMATION":
            raise ConflictException(f"Operation is in status '{op.status}', cannot confirm source removal")

        await self.repo.mark_confirmed(operation_id, user_id)

        source_meta_res = await self.file_repo.get_by_id(op.source_file_id, user_id)
        if source_meta_res:
            source_meta, _, _ = source_meta_res
            source_creds = await self._get_credentials(op.source_account_id, user_id)
            try:
                # Trash the source file via provider
                await self.provider.trash_file(source_creds, source_meta.provider_file_id)
                await self.file_repo.update_trashed_status(source_meta.id, user_id, trashed=True)
                await self.repo.update_status(operation_id, user_id, "COMPLETED")
            except Exception as e:
                # If source removal fails, keep destination and mark PARTIAL per specification!
                await self.repo.update_status(
                    operation_id,
                    user_id,
                    "PARTIAL",
                    safe_error_code="SOURCE_REMOVAL_FAILED",
                    safe_error_message="Destination copy verified, but source removal failed. Please check source account."
                )
        else:
            await self.repo.update_status(operation_id, user_id, "COMPLETED")

        updated_op = await self.repo.get_by_id(operation_id, user_id)
        return self._to_response_dto(updated_op)

    async def get_operation(self, operation_id: str, user_id: str) -> FileOperationResponse:
        op = await self.repo.get_by_id(operation_id, user_id)
        if not op:
            raise ResourceNotFoundException("Operation not found")
        return self._to_response_dto(op)

    async def list_operations(self, user_id: str, limit: int = 50, offset: int = 0) -> Tuple[List[FileOperationResponse], int]:
        ops, total = await self.repo.list_by_user(user_id, limit, offset)
        return [self._to_response_dto(op) for op in ops], total

    async def cancel_operation(self, operation_id: str, user_id: str) -> FileOperationResponse:
        op = await self.repo.get_by_id(operation_id, user_id)
        if not op:
            raise ResourceNotFoundException("Operation not found")

        if op.status in ("COMPLETED", "FAILED", "CANCELLED"):
            raise ConflictException(f"Operation already finished with status '{op.status}'")

        await self.repo.update_status(operation_id, user_id, "CANCELLED")
        await self.repo.release_reservation(operation_id)
        updated_op = await self.repo.get_by_id(operation_id, user_id)
        return self._to_response_dto(updated_op)

    def _to_response_dto(self, op: FileOperation) -> FileOperationResponse:
        pct = 0.0
        if op.progress_total and op.progress_total > 0 and op.progress_current:
            pct = round(min(100.0, (op.progress_current / op.progress_total) * 100), 1)

        return FileOperationResponse(
            id=op.id,
            operation_type=op.operation_type,
            status=op.status,
            source_account_id=op.source_account_id,
            destination_account_id=op.destination_account_id,
            source_file_id=op.source_file_id,
            destination_file_id=op.destination_file_id,
            progress_current=op.progress_current,
            progress_total=op.progress_total,
            progress_percentage=pct,
            safe_error_code=op.safe_error_code,
            safe_error_message=op.safe_error_message,
            retryable=op.retryable,
            confirmation_requested_at=op.confirmation_requested_at,
            confirmed_at=op.confirmed_at,
            created_at=op.created_at,
            updated_at=op.updated_at,
            finished_at=op.finished_at,
        )
