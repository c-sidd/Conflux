import pytest
from app.models.account import ConnectedAccount
from app.models.user import User
from app.services.placement_service import PlacementService


@pytest.mark.asyncio
async def test_placement_best_fit(db_session):
    user = User(id="user-1", email_normalized="test@example.com", password_hash="hash")
    db_session.add(user)

    # Account 1: 15 GB total, 10 GB used (5 GB free)
    acc1 = ConnectedAccount(
        id="acc-1",
        user_id="user-1",
        provider="GOOGLE_DRIVE",
        email="drive1@gmail.com",
        quota_total_bytes=15 * 1024 * 1024 * 1024,
        quota_used_bytes=10 * 1024 * 1024 * 1024,
        connection_status="CONNECTED",
    )
    # Account 2: 15 GB total, 2 GB used (13 GB free) -> Best fit!
    acc2 = ConnectedAccount(
        id="acc-2",
        user_id="user-1",
        provider="GOOGLE_DRIVE",
        email="drive2@gmail.com",
        quota_total_bytes=15 * 1024 * 1024 * 1024,
        quota_used_bytes=2 * 1024 * 1024 * 1024,
        connection_status="CONNECTED",
    )
    db_session.add_all([acc1, acc2])
    await db_session.commit()

    service = PlacementService(db_session)

    # 100 MB upload
    decision = await service.select_destination("user-1", file_size_bytes=100 * 1024 * 1024)
    assert decision.account_id == "acc-2"
    assert decision.placement_type == "AUTOMATIC"
    assert "Best-fit selected based on maximum available space" in decision.reason


@pytest.mark.asyncio
async def test_placement_manual_override(db_session):
    user = User(id="user-2", email_normalized="user2@example.com", password_hash="hash")
    acc1 = ConnectedAccount(
        id="acc-1",
        user_id="user-2",
        provider="GOOGLE_DRIVE",
        email="drive1@gmail.com",
        quota_total_bytes=15 * 1024 * 1024 * 1024,
        quota_used_bytes=10 * 1024 * 1024 * 1024,
        connection_status="CONNECTED",
    )
    db_session.add_all([user, acc1])
    await db_session.commit()

    service = PlacementService(db_session)
    decision = await service.select_destination("user-2", file_size_bytes=50 * 1024 * 1024, manual_account_id="acc-1")
    assert decision.account_id == "acc-1"
    assert decision.placement_type == "MANUAL"
