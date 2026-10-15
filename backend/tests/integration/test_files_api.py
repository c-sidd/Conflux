import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_file_operations_and_trash(client: AsyncClient):
    # Register & connect account
    reg_resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "filer@example.com", "password": "Password123!"}
    )
    cookies = reg_resp.cookies

    auth = (await client.post("/api/v1/accounts/google/authorize", cookies=cookies)).json()
    await client.get(f"/api/v1/accounts/google/callback?code=fake&state={auth['state']}", follow_redirects=False)

    # List unified files
    files_resp = await client.get("/api/v1/files", cookies=cookies)
    assert files_resp.status_code == 200
    files = files_resp.json()["items"]
    assert len(files) > 0

    first_file = files[0]
    file_id = first_file["id"]

    # Test Rename
    new_name = "Renamed_Spec.pdf"
    patch_resp = await client.patch(
        f"/api/v1/files/{file_id}",
        cookies=cookies,
        json={"name": new_name}
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["name"] == new_name

    # Test Star / Favorite
    star_resp = await client.post(
        f"/api/v1/files/{file_id}/star",
        cookies=cookies,
        json={"is_starred": True}
    )
    assert star_resp.status_code == 200

    starred_list = (await client.get("/api/v1/files/starred", cookies=cookies)).json()
    assert any(f["id"] == file_id for f in starred_list)

    # Test Search
    search_resp = await client.get(f"/api/v1/search?q={new_name[:5]}", cookies=cookies)
    assert search_resp.status_code == 200
    assert len(search_resp.json()["items"]) > 0

    # Test Move to Trash
    trash_resp = await client.post(f"/api/v1/files/{file_id}/trash", cookies=cookies)
    assert trash_resp.status_code == 200

    # Verify visible in /trash
    trash_list = (await client.get("/api/v1/trash", cookies=cookies)).json()
    assert any(t["id"] == file_id for t in trash_list)

    # Test Restore from Trash
    restore_resp = await client.post(f"/api/v1/files/{file_id}/restore", cookies=cookies)
    assert restore_resp.status_code == 200

    # Verify back in active files
    active_files = (await client.get("/api/v1/files", cookies=cookies)).json()["items"]
    assert any(f["id"] == file_id for f in active_files)
