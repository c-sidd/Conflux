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


@pytest.mark.asyncio
async def test_security_question_registration_and_reset(client: AsyncClient):
    # 1. Register with security question and answer
    reg_resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "dave@example.com",
            "password": "OldPassword123!",
            "security_question": "What was the name of your first school?",
            "security_answer": "Oakwood High",
        }
    )
    assert reg_resp.status_code == 201

    # 2. Query security question
    q_resp = await client.post(
        "/api/v1/auth/security-question",
        json={"email": "dave@example.com"}
    )
    assert q_resp.status_code == 200
    assert q_resp.json()["security_question"] == "What was the name of your first school?"

    # 3. Fail with wrong answer
    wrong_reset = await client.post(
        "/api/v1/auth/reset-password-question",
        json={
            "email": "dave@example.com",
            "security_answer": "Wrong School",
            "new_password": "NewSecurePassword123!",
        }
    )
    assert wrong_reset.status_code == 400
    assert wrong_reset.json()["code"] == "SECURITY_ANSWER_MISMATCH"

    # 4. Succeed with case-insensitive answer
    reset_resp = await client.post(
        "/api/v1/auth/reset-password-question",
        json={
            "email": "dave@example.com",
            "security_answer": "oakwood high",
            "new_password": "NewSecurePassword123!",
        }
    )
    assert reset_resp.status_code == 200

    # 5. Log in with new password
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "dave@example.com", "password": "NewSecurePassword123!"}
    )
    assert login_resp.status_code == 200
    assert login_resp.json()["email"] == "dave@example.com"
