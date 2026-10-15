import hashlib
import hmac
import json
import secrets
import time
import urllib.parse
from typing import Any, Dict, List, Optional, Tuple
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.crypto import token_cipher
from app.core.errors import ConfluxException, ResourceNotFoundException
from app.models.account import ConnectedAccount
from app.providers import get_storage_provider
from app.repositories.account_repo import AccountRepository
from app.schemas.account import ConnectedAccountResponse, QuotaSnapshot


class AccountService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AccountRepository(db)
        self.provider = get_storage_provider()

    def generate_oauth_state(self, user_id: str) -> Tuple[str, str]:
        """
        Generates a cryptographically signed OAuth state and nonce to prevent CSRF and session fixation.
        State format: <nonce>.<timestamp>.<user_id>.<hmac_signature>
        """
        nonce = secrets.token_urlsafe(24)
        ts_str = str(int(time.time()))
        payload = f"{nonce}:{ts_str}:{user_id}"
        sig = hmac.new(settings.CSRF_SECRET.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
        state = f"{nonce}.{ts_str}.{user_id}.{sig}"
        return state, nonce

    def verify_oauth_state(self, state: str, expected_nonce: Optional[str] = None) -> str:
        """
        Verifies HMAC signature, 10-minute validity window, and nonce binding.
        Returns the authenticating user_id.
        """
        # Fallback for mock test state: "<user_id>:fake_nonce"
        if settings.USE_FAKE_STORAGE_PROVIDER and ":" in state and "." not in state:
            return state.split(":", 1)[0]

        if not state or state.count(".") != 3:
            raise ConfluxException("INVALID_OAUTH_STATE", "Invalid OAuth state format", status_code=400)

        nonce, ts_str, user_id, sig = state.split(".", 3)

        if expected_nonce and nonce != expected_nonce:
            raise ConfluxException("INVALID_OAUTH_STATE", "OAuth nonce mismatch or session binding error", status_code=400)

        try:
            ts = int(ts_str)
            if time.time() - ts > 600:
                raise ConfluxException("EXPIRED_OAUTH_STATE", "OAuth authorization session expired. Please try again.", status_code=400)
        except ValueError:
            raise ConfluxException("INVALID_OAUTH_STATE", "Invalid OAuth timestamp", status_code=400)

        payload = f"{nonce}:{ts_str}:{user_id}"
        expected_sig = hmac.new(settings.CSRF_SECRET.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            raise ConfluxException("INVALID_OAUTH_STATE", "Forged or tampered OAuth state parameter", status_code=400)

        return user_id

    def get_authorization_url(self, user_id: str) -> Dict[str, str]:
        """
        Builds Google OAuth 2.0 authorization URL with signed CSRF state token.
        """
        state, nonce = self.generate_oauth_state(user_id)

        if settings.USE_FAKE_STORAGE_PROVIDER:
            auth_url = f"{settings.API_PUBLIC_URL}/api/v1/accounts/google/callback?code=fake_auth_code&state={state}"
            return {"authorization_url": auth_url, "state": state, "nonce": nonce}

        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": " ".join(settings.GOOGLE_SCOPES),
            "access_type": "offline",
            "prompt": "consent",
            "state": state,
        }
        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"
        return {"authorization_url": auth_url, "state": state, "nonce": nonce}

    async def handle_oauth_callback(
        self,
        code: str,
        state: str,
        expected_nonce: Optional[str] = None
    ) -> ConnectedAccount:
        # Validate state cryptographically binds to the user and nonce
        user_id = self.verify_oauth_state(state, expected_nonce)

        if settings.USE_FAKE_STORAGE_PROVIDER:
            # Fake token exchange
            provider_account_id = f"google-sub-{secrets.token_hex(4)}"
            email = f"user.{secrets.token_hex(2)}@gmail.com"
            display_name = "Google User"
            raw_refresh_token = f"fake_refresh_token_{secrets.token_hex(16)}"
            granted_scopes = json.dumps(settings.GOOGLE_SCOPES)
        else:
            # Real Google Token Exchange
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "client_id": settings.GOOGLE_CLIENT_ID,
                        "client_secret": settings.GOOGLE_CLIENT_SECRET,
                        "code": code,
                        "grant_type": "authorization_code",
                        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                    },
                    timeout=15.0,
                )
                if not resp.is_success:
                    raise ConfluxException("OAUTH_EXCHANGE_FAILED", "Failed to exchange authorization code with Google", status_code=400)
                token_data = resp.json()

            raw_refresh_token = token_data.get("refresh_token")
            access_token = token_data.get("access_token")
            granted_scopes = json.dumps(token_data.get("scope", "").split())

            # Fetch user info using id_token or userinfo endpoint
            async with httpx.AsyncClient() as client:
                userinfo_resp = await client.get(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=10.0,
                )
                if not userinfo_resp.is_success:
                    raise ConfluxException("OAUTH_USERINFO_FAILED", "Failed to fetch user profile from Google", status_code=400)
                userinfo = userinfo_resp.json()

            provider_account_id = userinfo.get("sub")
            email = userinfo.get("email")
            display_name = userinfo.get("name")

        # Encrypt refresh token
        encrypted_payload = token_cipher.encrypt(raw_refresh_token)
        encrypted_token_str = json.dumps(encrypted_payload)

        account = await self.repo.create_or_reconnect(
            user_id=user_id,
            provider="GOOGLE_DRIVE",
            provider_account_id=provider_account_id,
            email=email,
            display_name=display_name,
            encrypted_refresh_token=encrypted_token_str,
            granted_scopes=granted_scopes,
        )

        # Refresh quota immediately
        await self.refresh_quota(account.id, user_id)
        return account

    async def list_accounts(self, user_id: str) -> List[ConnectedAccountResponse]:
        accounts = await self.repo.list_by_user(user_id)
        responses = []
        for acc in accounts:
            responses.append(self._to_response_dto(acc))
        return responses

    async def get_account(self, account_id: str, user_id: str) -> ConnectedAccountResponse:
        acc = await self.repo.get_by_id(account_id, user_id)
        if not acc:
            raise ResourceNotFoundException("Connected account not found")
        return self._to_response_dto(acc)

    async def refresh_quota(self, account_id: str, user_id: str) -> QuotaSnapshot:
        acc = await self.repo.get_by_id(account_id, user_id)
        if not acc:
            raise ResourceNotFoundException("Connected account not found")

        credentials = {"email": acc.email}
        if acc.encrypted_refresh_token:
            try:
                decrypted_rt = token_cipher.decrypt(json.loads(acc.encrypted_refresh_token))
                credentials["refresh_token"] = decrypted_rt
            except Exception:
                pass

        try:
            about_data = await self.provider.get_about(credentials)
            storage_quota = about_data.get("storageQuota", {})
            total_bytes = int(storage_quota.get("limit")) if storage_quota.get("limit") else None
            used_bytes = int(storage_quota.get("usage")) if storage_quota.get("usage") else None

            await self.repo.update_quota(account_id, user_id, total_bytes, used_bytes)
            await self.repo.update_status(account_id, user_id, "CONNECTED")

            return QuotaSnapshot(
                quota_total_bytes=total_bytes,
                quota_used_bytes=used_bytes,
                quota_source="GOOGLE_DRIVE",
            )
        except Exception as e:
            await self.repo.update_status(account_id, user_id, "ERROR", error_code="QUOTA_FETCH_FAILED")
            return QuotaSnapshot(
                quota_total_bytes=acc.quota_total_bytes,
                quota_used_bytes=acc.quota_used_bytes,
                quota_source="CACHED",
            )

    async def disconnect_account(self, account_id: str, user_id: str) -> None:
        acc = await self.repo.get_by_id(account_id, user_id)
        if not acc:
            raise ResourceNotFoundException("Connected account not found")

        success = await self.repo.disconnect(account_id, user_id)
        if not success:
            raise ResourceNotFoundException("Could not disconnect account")

    def _to_response_dto(self, acc: ConnectedAccount) -> ConnectedAccountResponse:
        return ConnectedAccountResponse(
            id=acc.id,
            provider=acc.provider,
            email=acc.email,
            display_name=acc.display_name,
            connection_status=acc.connection_status,
            last_successful_sync_at=acc.last_successful_sync_at,
            last_sync_attempt_at=acc.last_sync_attempt_at,
            last_error_code=acc.last_error_code,
            quota=QuotaSnapshot(
                quota_total_bytes=acc.quota_total_bytes,
                quota_used_bytes=acc.quota_used_bytes,
                quota_observed_at=acc.quota_observed_at,
                quota_source=acc.quota_source,
            ),
            created_at=acc.created_at,
            updated_at=acc.updated_at,
        )
