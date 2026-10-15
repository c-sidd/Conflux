import uuid
from datetime import datetime, timezone
from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Index, String, Text, UniqueConstraint
from app.db.session import Base


class ConnectedAccount(Base):
    __tablename__ = "connected_accounts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String(32), nullable=False, default="GOOGLE_DRIVE")
    provider_account_id = Column(String(255), nullable=True)  # Google user ID (sub)
    email = Column(String(255), nullable=True, index=True)
    display_name = Column(String(255), nullable=True)
    encrypted_refresh_token = Column(Text, nullable=True)  # JSON formatted ciphertext + nonce + version
    granted_scopes = Column(Text, nullable=True)           # JSON array of scopes
    connection_status = Column(String(32), nullable=False, default="CONNECTED")  # CONNECTED, NEEDS_REAUTH, DISCONNECTED, ERROR
    last_successful_sync_at = Column(DateTime(timezone=True), nullable=True)
    last_sync_attempt_at = Column(DateTime(timezone=True), nullable=True)
    last_error_code = Column(String(64), nullable=True)

    # Quota observation
    quota_total_bytes = Column(BigInteger, nullable=True)
    quota_used_bytes = Column(BigInteger, nullable=True)
    quota_observed_at = Column(DateTime(timezone=True), nullable=True)
    quota_source = Column(String(64), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    disconnected_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("user_id", "provider", "provider_account_id", name="uq_user_provider_account"),
    )


class SyncState(Base):
    __tablename__ = "sync_states"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    connected_account_id = Column(
        String(36),
        ForeignKey("connected_accounts.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True
    )
    change_cursor = Column(String(512), nullable=True)
    initial_sync_status = Column(String(32), nullable=False, default="PENDING")  # PENDING, RUNNING, COMPLETED, FAILED
    last_started_at = Column(DateTime(timezone=True), nullable=True)
    last_success_at = Column(DateTime(timezone=True), nullable=True)
    last_error_code = Column(String(64), nullable=True)
    reconciliation_due_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )
