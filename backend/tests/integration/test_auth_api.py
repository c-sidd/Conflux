import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_and_me(client: AsyncClient):
    reg_resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "alice@example.com", "password": "SecurePassword123!"}
    )
    assert reg_resp.status_code == 201
    reg_data = reg_resp.json()
    assert reg_data["email"] == "alice@example.com"
    assert "conflux_session" in reg_resp.cookies

    # Calling /me with the session cookie
    me_resp = await client.get("/api/v1/auth/me", cookies=reg_resp.cookies)
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "alice@example.com"


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient):
    await client.post(
        "/api/v1/auth/register",
        json={"email": "bob@example.com", "password": "CorrectPassword123!"}
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "bob@example.com", "password": "WrongPassword123!"}
    )
    assert login_resp.status_code == 401
    assert login_resp.json()["code"] == "AUTH_REQUIRED"


@pytest.mark.asyncio
async def test_logout(client: AsyncClient):
    reg_resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "carol@example.com", "password": "SecurePassword123!"}
    )
    cookies = reg_resp.cookies
    logout_resp = await client.post("/api/v1/auth/logout", cookies=cookies)
    assert logout_resp.status_code == 200

    # /me should now fail
    me_resp = await client.get("/api/v1/auth/me", cookies=cookies)
    assert me_resp.status_code == 401
