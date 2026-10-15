import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_cross_tenant_isolation(client: AsyncClient):
    # Register User A
    resp_a = await client.post(
        "/api/v1/auth/register",
        json={"email": "usera@example.com", "password": "Password123!"}
    )
    cookies_a = resp_a.cookies

    # Register User B
    resp_b = await client.post(
        "/api/v1/auth/register",
        json={"email": "userb@example.com", "password": "Password123!"}
    )
    cookies_b = resp_b.cookies

    # User A connects a Google Account via authorize & callback
    auth_resp_a = await client.post("/api/v1/accounts/google/authorize", cookies=cookies_a)
    state_a = auth_resp_a.json()["state"]

    callback_resp = await client.get(
        f"/api/v1/accounts/google/callback?code=fake_code&state={state_a}",
        follow_redirects=False
    )
    assert callback_resp.status_code == 307

    # User A lists accounts
    accs_a = (await client.get("/api/v1/accounts", cookies=cookies_a)).json()
    assert len(accs_a) >= 1
    acc_a_id = accs_a[0]["id"]

    # User B tries to view User A's connected account -> 404
    cross_acc_resp = await client.get(f"/api/v1/accounts/{acc_a_id}", cookies=cookies_b)
    assert cross_acc_resp.status_code == 404
    assert cross_acc_resp.json()["code"] == "RESOURCE_NOT_FOUND"

    # User A has synced files
    files_a = (await client.get("/api/v1/files", cookies=cookies_a)).json()["items"]
    assert len(files_a) > 0
    file_a_id = files_a[0]["id"]

    # User B tries to access User A's file -> 404
    cross_file_resp = await client.get(f"/api/v1/files/{file_a_id}", cookies=cookies_b)
    assert cross_file_resp.status_code == 404

    # User B tries to download User A's file -> 404
    cross_dl_resp = await client.get(f"/api/v1/files/{file_a_id}/content", cookies=cookies_b)
    assert cross_dl_resp.status_code == 404

    # User B tries to delete/trash User A's file -> 404
    cross_trash_resp = await client.post(f"/api/v1/files/{file_a_id}/trash", cookies=cookies_b)
    assert cross_trash_resp.status_code == 404

    # User B lists files -> User B sees 0 files (none of User A's files leak)
    files_b = (await client.get("/api/v1/files", cookies=cookies_b)).json()["items"]
    assert len(files_b) == 0
