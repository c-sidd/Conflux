"""initial schema

Revision ID: 20261011_0001
Revises:
Create Date: 2026-10-11 15:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '20261011_0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('email_normalized', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('email_verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email_normalized')
    )
    op.create_index('ix_users_email_normalized', 'users', ['email_normalized'])

    # User Sessions
    op.create_table(
        'user_sessions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('user_agent_summary', sa.String(length=255), nullable=True),
        sa.Column('ip_coarse', sa.String(length=64), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token_hash')
    )
    op.create_index('ix_user_sessions_user_id', 'user_sessions', ['user_id'])
    op.create_index('ix_user_sessions_token_hash', 'user_sessions', ['token_hash'])

    # Password Reset Tokens
    op.create_table(
        'password_reset_tokens',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token_hash')
    )

    # Connected Accounts
    op.create_table(
        'connected_accounts',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('provider', sa.String(length=32), nullable=False, server_default='GOOGLE_DRIVE'),
        sa.Column('provider_account_id', sa.String(length=255), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('display_name', sa.String(length=255), nullable=True),
        sa.Column('encrypted_refresh_token', sa.Text(), nullable=True),
        sa.Column('granted_scopes', sa.Text(), nullable=True),
        sa.Column('connection_status', sa.String(length=32), nullable=False, server_default='CONNECTED'),
        sa.Column('last_successful_sync_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_sync_attempt_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_error_code', sa.String(length=64), nullable=True),
        sa.Column('quota_total_bytes', sa.BigInteger(), nullable=True),
        sa.Column('quota_used_bytes', sa.BigInteger(), nullable=True),
        sa.Column('quota_observed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('quota_source', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('disconnected_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'provider', 'provider_account_id', name='uq_user_provider_account')
    )
    op.create_index('ix_connected_accounts_user_id', 'connected_accounts', ['user_id'])

    # Sync States
    op.create_table(
        'sync_states',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('connected_account_id', sa.String(length=36), nullable=False),
        sa.Column('change_cursor', sa.String(length=512), nullable=True),
        sa.Column('initial_sync_status', sa.String(length=32), nullable=False, server_default='PENDING'),
        sa.Column('last_started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_success_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_error_code', sa.String(length=64), nullable=True),
        sa.Column('reconciliation_due_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['connected_account_id'], ['connected_accounts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('connected_account_id')
    )

    # File Metadata
    op.create_table(
        'file_metadata',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('connected_account_id', sa.String(length=36), nullable=False),
        sa.Column('provider', sa.String(length=32), nullable=False, server_default='GOOGLE_DRIVE'),
        sa.Column('provider_file_id', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=512), nullable=False),
        sa.Column('mime_type', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('parent_provider_file_id', sa.String(length=255), nullable=True),
        sa.Column('size_bytes', sa.BigInteger(), nullable=True),
        sa.Column('modified_time_provider', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_time_provider', sa.DateTime(timezone=True), nullable=True),
        sa.Column('web_view_link', sa.Text(), nullable=True),
        sa.Column('trashed_provider', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_folder', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_shortcut', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('capability_snapshot', sa.Text(), nullable=True),
        sa.Column('checksum', sa.String(length=128), nullable=True),
        sa.Column('last_synced_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['connected_account_id'], ['connected_accounts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('connected_account_id', 'provider_file_id', name='uq_account_provider_file')
    )
    op.create_index('ix_file_metadata_user_id', 'file_metadata', ['user_id'])
    op.create_index('ix_file_user_account_parent', 'file_metadata', ['user_id', 'connected_account_id', 'parent_provider_file_id'])
    op.create_index('ix_file_user_trashed', 'file_metadata', ['user_id', 'trashed_provider'])

    # User File Preferences (Starred)
    op.create_table(
        'user_file_preferences',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('file_metadata_id', sa.String(length=36), nullable=False),
        sa.Column('is_starred', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['file_metadata_id'], ['file_metadata.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'file_metadata_id', name='uq_user_file_pref')
    )

    # Recent Activities
    op.create_table(
        'recent_activities',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('file_metadata_id', sa.String(length=36), nullable=True),
        sa.Column('connected_account_id', sa.String(length=36), nullable=True),
        sa.Column('action', sa.String(length=64), nullable=False),
        sa.Column('occurred_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('metadata_json', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['connected_account_id'], ['connected_accounts.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['file_metadata_id'], ['file_metadata.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # File Operations
    op.create_table(
        'file_operations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('operation_type', sa.String(length=32), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='QUEUED'),
        sa.Column('source_account_id', sa.String(length=36), nullable=True),
        sa.Column('destination_account_id', sa.String(length=36), nullable=True),
        sa.Column('source_file_id', sa.String(length=36), nullable=True),
        sa.Column('destination_file_id', sa.String(length=36), nullable=True),
        sa.Column('idempotency_key', sa.String(length=255), nullable=True),
        sa.Column('progress_current', sa.BigInteger(), nullable=True, server_default='0'),
        sa.Column('progress_total', sa.BigInteger(), nullable=True, server_default='0'),
        sa.Column('progress_unit', sa.String(length=32), nullable=True, server_default='BYTES'),
        sa.Column('attempt_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('next_retry_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('requested_options', sa.Text(), nullable=True),
        sa.Column('safe_error_code', sa.String(length=64), nullable=True),
        sa.Column('safe_error_message', sa.Text(), nullable=True),
        sa.Column('retryable', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('confirmation_requested_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('correlation_id', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['destination_account_id'], ['connected_accounts.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['destination_file_id'], ['file_metadata.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['source_account_id'], ['connected_accounts.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['source_file_id'], ['file_metadata.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_op_user_status_created', 'file_operations', ['user_id', 'status', 'created_at'])

    # Operation Items
    op.create_table(
        'operation_items',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('operation_id', sa.String(length=36), nullable=False),
        sa.Column('source_provider_file_id', sa.String(length=255), nullable=True),
        sa.Column('destination_provider_file_id', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='QUEUED'),
        sa.Column('attempt_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('safe_error_code', sa.String(length=64), nullable=True),
        sa.Column('safe_error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['operation_id'], ['file_operations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Upload Reservations
    op.create_table(
        'upload_reservations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('connected_account_id', sa.String(length=36), nullable=False),
        sa.Column('operation_id', sa.String(length=36), nullable=False),
        sa.Column('estimated_bytes', sa.BigInteger(), nullable=True),
        sa.Column('state', sa.String(length=32), nullable=False, server_default='ACTIVE'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('released_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['connected_account_id'], ['connected_accounts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['operation_id'], ['file_operations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('operation_id')
    )

    # Audit Events
    op.create_table(
        'audit_events',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('connected_account_id', sa.String(length=36), nullable=True),
        sa.Column('operation_id', sa.String(length=36), nullable=True),
        sa.Column('event_type', sa.String(length=64), nullable=False),
        sa.Column('occurred_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('outcome', sa.String(length=32), nullable=False),
        sa.Column('metadata_json', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('audit_events')
    op.drop_table('upload_reservations')
    op.drop_table('operation_items')
    op.drop_table('file_operations')
    op.drop_table('recent_activities')
    op.drop_table('user_file_preferences')
    op.drop_table('file_metadata')
    op.drop_table('sync_states')
    op.drop_table('connected_accounts')
    op.drop_table('password_reset_tokens')
    op.drop_table('user_sessions')
    op.drop_table('users')
