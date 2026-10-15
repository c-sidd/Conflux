import io
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_upload_and_cross_account_move_safety(client: AsyncClient):
    # Register and connect two accounts
    reg_resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "operator@example.com", "password": "Password123!"}
    )
    cookies = reg_resp.cookies

    # Connect Account 1
    auth1 = (await client.post("/api/v1/accounts/google/authorize", cookies=cookies)).json()
    await client.get(f"/api/v1/accounts/google/callback?code=c1&state={auth1['state']}", follow_redirects=False)

    # Connect Account 2
    auth2 = (await client.post("/api/v1/accounts/google/authorize", cookies=cookies)).json()
    await client.get(f"/api/v1/accounts/google/callback?code=c2&state={auth2['state']}", follow_redirects=False)

    accs = (await client.get("/api/v1/accounts", cookies=cookies)).json()
    assert len(accs) == 2
    acc1_id = accs[0]["id"]
    acc2_id = accs[1]["id"]

    # 1. Test Best-Fit Upload
    init_upload = await client.post(
        "/api/v1/uploads",
        cookies=cookies,
        json={"name": "test_document.txt", "mime_type": "text/plain", "size_bytes": 1024}
    )
    assert init_upload.status_code == 201
    upload_data = init_upload.json()
    op_id = upload_data["operation_id"]
    assert upload_data["placement_type"] == "AUTOMATIC"

    # Complete Upload
    complete_resp = await client.post(
        f"/api/v1/uploads/{op_id}/complete",
        cookies=cookies,
        files={"file": ("test_document.txt", b"Hello Conflux World!", "text/plain")}
    )
    assert complete_resp.status_code == 200
    assert complete_resp.json()["status"] == "COMPLETED"

    # File should appear in unified files list with source label
    files_resp = await client.get("/api/v1/files", cookies=cookies)
    files = files_resp.json()["items"]
    uploaded_file = next(f for f in files if f["name"] == "test_document.txt")
    assert uploaded_file["source_account_email"] is not None

    # 2. Test Cross-Account Move Safety Flow
    # Initiating move to the other account
    target_acc = acc2_id if uploaded_file["connected_account_id"] == acc1_id else acc1_id
    move_resp = await client.post(
        f"/api/v1/files/{uploaded_file['id']}/move",
        cookies=cookies,
        json={"destination_account_id": target_acc}
    )
    assert move_resp.status_code == 202
    move_op = move_resp.json()
    # Must transition to AWAITING_CONFIRMATION! Source MUST NOT be deleted yet!
    assert move_op["status"] == "AWAITING_CONFIRMATION"

    # Verify source file is STILL not trashed yet!
    source_check = await client.get(f"/api/v1/files/{uploaded_file['id']}", cookies=cookies)
    assert source_check.status_code == 200
    assert source_check.json()["trashed_provider"] is False

    # Explicit confirmation from user to remove source
    confirm_resp = await client.post(
        f"/api/v1/operations/{move_op['id']}/confirm-source-removal",
        cookies=cookies,
        json={"confirmed": True}
    )
    assert confirm_resp.status_code == 200
    assert confirm_resp.json()["status"] == "COMPLETED"

    # Now source file is moved to trash
    source_after = await client.get(f"/api/v1/files/{uploaded_file['id']}", cookies=cookies)
    assert source_after.json()["trashed_provider"] is True
