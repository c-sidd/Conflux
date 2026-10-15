from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import QuotaInsufficientException, ResourceNotFoundException
from app.models.account import ConnectedAccount
from app.repositories.account_repo import AccountRepository
from app.repositories.operation_repo import OperationRepository


class PlacementDecision:
    def __init__(
        self,
        account_id: str,
        account_email: str,
        placement_type: str,  # AUTOMATIC or MANUAL
        reason: str,
        available_bytes: Optional[int] = None
    ):
        self.account_id = account_id
        self.account_email = account_email
        self.placement_type = placement_type
        self.reason = reason
        self.available_bytes = available_bytes


class PlacementService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.account_repo = AccountRepository(db)
        self.operation_repo = OperationRepository(db)

    async def select_destination(
        self,
        user_id: str,
        file_size_bytes: int,
        manual_account_id: Optional[str] = None
    ) -> PlacementDecision:
        accounts = await self.account_repo.list_by_user(user_id)
        if not accounts:
            raise ResourceNotFoundException("No connected Google Drive accounts found. Please connect an account first.")

        # Manual destination override requested
        if manual_account_id:
            target_acc = next((a for a in accounts if a.id == manual_account_id), None)
            if not target_acc:
                raise ResourceNotFoundException("Specified target account not found or not connected")

            if target_acc.connection_status != "CONNECTED":
                raise QuotaInsufficientException(f"Account {target_acc.email} is in status '{target_acc.connection_status}'. Please re-authenticate.")

            reserved_bytes = await self.operation_repo.get_active_reserved_bytes(target_acc.id)
            available = None
            if target_acc.quota_total_bytes is not None and target_acc.quota_used_bytes is not None:
                available = max(0, target_acc.quota_total_bytes - target_acc.quota_used_bytes - reserved_bytes)
                if file_size_bytes > 0 and file_size_bytes > available:
                    raise QuotaInsufficientException(
                        f"Selected account {target_acc.email} has insufficient capacity ({available / (1024*1024):.1f} MB available, requires {file_size_bytes / (1024*1024):.1f} MB)"
                    )

            return PlacementDecision(
                account_id=target_acc.id,
                account_email=target_acc.email or target_acc.id,
                placement_type="MANUAL",
                reason=f"Manually selected by user ({target_acc.email})",
                available_bytes=available,
            )

        # Automatic Best-Fit Placement
        eligible_candidates: List[Tuple[ConnectedAccount, int, int]] = []
        ineligible_reasons: Dict[str, str] = {}

        for acc in accounts:
            if acc.connection_status != "CONNECTED":
                ineligible_reasons[acc.email or acc.id] = f"Status is {acc.connection_status}"
                continue

            reserved_bytes = await self.operation_repo.get_active_reserved_bytes(acc.id)

            if acc.quota_total_bytes is not None and acc.quota_used_bytes is not None:
                free_bytes = max(0, acc.quota_total_bytes - acc.quota_used_bytes - reserved_bytes)
                if file_size_bytes > 0 and free_bytes < file_size_bytes:
                    ineligible_reasons[acc.email or acc.id] = (
                        f"Insufficient space ({free_bytes / (1024*1024):.1f} MB free, needs {file_size_bytes / (1024*1024):.1f} MB)"
                    )
                    continue
                eligible_candidates.append((acc, free_bytes, reserved_bytes))
            else:
                # Quota unknown, candidate with default fallback priority
                eligible_candidates.append((acc, 10 * 1024 * 1024 * 1024, reserved_bytes))

        if not eligible_candidates:
            details = "; ".join([f"{email}: {r}" for email, r in ineligible_reasons.items()])
            raise QuotaInsufficientException(f"No eligible accounts available for upload: {details}")

        # Best-Fit Selection: Account with the most free remaining capacity
        eligible_candidates.sort(key=lambda item: item[1], reverse=True)
        best_acc, free_bytes, _ = eligible_candidates[0]

        reason = (
            f"Best-fit selected based on maximum available space "
            f"({free_bytes / (1024*1024):.1f} MB available across {len(eligible_candidates)} eligible accounts)"
        )

        return PlacementDecision(
            account_id=best_acc.id,
            account_email=best_acc.email or best_acc.id,
            placement_type="AUTOMATIC",
            reason=reason,
            available_bytes=free_bytes,
        )
