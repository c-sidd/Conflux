import secrets
import hashlib

class TokenService:
    @staticmethod
    def generate_raw_token() -> str:
        """
        Generates a cryptographically secure 256-bit URL-safe token.
        """
        return secrets.token_urlsafe(32)

    @staticmethod
    def hash_token(raw_token: str) -> str:
        """
        Computes SHA-256 hash string for a raw token.
        """
        return hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
