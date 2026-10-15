import uuid
from datetime import datetime, timezone
from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, Index, String, Text, UniqueConstraint
from app.db.session import Base


class FileMetadata(Base):
    __tablename__ = "file_metadata"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    connected_account_id = Column(
        String(36),
        ForeignKey("connected_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    provider = Column(String(32), nullable=False, default="GOOGLE_DRIVE")
    provider_file_id = Column(String(255), nullable=False, index=True)
    name = Column(String(512), nullable=False, index=True)
    mime_type = Column(String(255), nullable=False, default="application/octet-stream")
    description = Column(Text, nullable=True)
    parent_provider_file_id = Column(String(255), nullable=True, index=True)
    size_bytes = Column(BigInteger, nullable=True)
    modified_time_provider = Column(DateTime(timezone=True), nullable=True)
    created_time_provider = Column(DateTime(timezone=True), nullable=True)
    web_view_link = Column(Text, nullable=True)
    trashed_provider = Column(Boolean, nullable=False, default=False, index=True)
    is_folder = Column(Boolean, nullable=False, default=False)
    is_shortcut = Column(Boolean, nullable=False, default=False)
    capability_snapshot = Column(Text, nullable=True)  # JSON capabilities (canTrash, canCopy, canShare, etc.)
    checksum = Column(String(128), nullable=True)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint("connected_account_id", "provider_file_id", name="uq_account_provider_file"),
        Index("ix_file_user_account_parent", "user_id", "connected_account_id", "parent_provider_file_id"),
        Index("ix_file_user_trashed", "user_id", "trashed_provider"),
    )


class UserFilePreference(Base):
    __tablename__ = "user_file_preferences"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    file_metadata_id = Column(
        String(36),
        ForeignKey("file_metadata.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    is_starred = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint("user_id", "file_metadata_id", name="uq_user_file_pref"),
    )


class RecentActivity(Base):
    __tablename__ = "recent_activities"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    file_metadata_id = Column(
        String(36),
        ForeignKey("file_metadata.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    connected_account_id = Column(
        String(36),
        ForeignKey("connected_accounts.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    action = Column(String(64), nullable=False)  # VIEWED, DOWNLOADED, UPLOADED, RENAMED, MOVED, COPIED, TRASHED, RESTORED
    occurred_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    metadata_json = Column(Text, nullable=True)
