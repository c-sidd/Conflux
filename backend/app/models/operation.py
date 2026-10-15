import uuid
from datetime import datetime, timezone
from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, Index, Integer, String, Text
from app.db.session import Base


class FileOperation(Base):
    __tablename__ = "file_operations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    operation_type = Column(String(32), nullable=False)  # UPLOAD, DOWNLOAD, COPY, CROSS_ACCOUNT_MOVE, RENAME, MOVE, TRASH, RESTORE, SHARE, SYNC, BULK_OPERATION, RECONCILE
    status = Column(String(32), nullable=False, default="QUEUED", index=True)  # QUEUED, RUNNING, VERIFYING, AWAITING_CONFIRMATION, COMPLETED, PARTIAL, FAILED, CANCEL_REQUESTED, CANCELLED
    source_account_id = Column(String(36), ForeignKey("connected_accounts.id", ondelete="SET NULL"), nullable=True)
    destination_account_id = Column(String(36), ForeignKey("connected_accounts.id", ondelete="SET NULL"), nullable=True)
    source_file_id = Column(String(36), ForeignKey("file_metadata.id", ondelete="SET NULL"), nullable=True)
    destination_file_id = Column(String(36), ForeignKey("file_metadata.id", ondelete="SET NULL"), nullable=True)
    idempotency_key = Column(String(255), nullable=True, index=True)

    progress_current = Column(BigInteger, nullable=True, default=0)
    progress_total = Column(BigInteger, nullable=True, default=0)
    progress_unit = Column(String(32), nullable=True, default="BYTES")

    attempt_count = Column(Integer, nullable=False, default=0)
    next_retry_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)

    requested_options = Column(Text, nullable=True)  # JSON sanitized options
    safe_error_code = Column(String(64), nullable=True)
    safe_error_message = Column(Text, nullable=True)
    retryable = Column(Boolean, nullable=False, default=True)

    confirmation_requested_at = Column(DateTime(timezone=True), nullable=True)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    correlation_id = Column(String(64), nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    __table_args__ = (
        Index("ix_op_user_status_created", "user_id", "status", "created_at"),
    )


class OperationItem(Base):
    __tablename__ = "operation_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    operation_id = Column(String(36), ForeignKey("file_operations.id", ondelete="CASCADE"), nullable=False, index=True)
    source_provider_file_id = Column(String(255), nullable=True)
    destination_provider_file_id = Column(String(255), nullable=True)
    status = Column(String(32), nullable=False, default="QUEUED")  # QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED
    attempt_count = Column(Integer, nullable=False, default=0)
    safe_error_code = Column(String(64), nullable=True)
    safe_error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )


class UploadReservation(Base):
    __tablename__ = "upload_reservations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    connected_account_id = Column(String(36), ForeignKey("connected_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    operation_id = Column(String(36), ForeignKey("file_operations.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    estimated_bytes = Column(BigInteger, nullable=True)
    state = Column(String(32), nullable=False, default="ACTIVE")  # ACTIVE, RELEASED, EXPIRED
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    released_at = Column(DateTime(timezone=True), nullable=True)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    connected_account_id = Column(String(36), nullable=True)
    operation_id = Column(String(36), nullable=True)
    event_type = Column(String(64), nullable=False, index=True)
    occurred_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    outcome = Column(String(32), nullable=False)  # SUCCESS, FAILURE, PARTIAL
    metadata_json = Column(Text, nullable=True)
