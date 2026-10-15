import base64
import json
import os
from typing import Dict, Tuple
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.core.config import settings


class TokenCipher:
    CURRENT_KEY_VERSION = "v1"

    def __init__(self, key_material: str = settings.TOKEN_ENCRYPTION_KEY):
        # Key must be 32 bytes for AES-256
        try:
            decoded = base64.urlsafe_b64decode(key_material)
            if len(decoded) == 32:
                self.key = decoded
            else:
                # Fallback to sha256 derivation if raw string supplied
                import hashlib
                self.key = hashlib.sha256(key_material.encode("utf-8")).digest()
        except Exception:
            import hashlib
            self.key = hashlib.sha256(key_material.encode("utf-8")).digest()

        self.aesgcm = AESGCM(self.key)

    def encrypt(self, plaintext: str) -> Dict[str, str]:
        """
        Encrypts plaintext string using AES-256-GCM.
        Returns a dict with 'ciphertext', 'nonce', and 'key_version'.
        """
        if not plaintext:
            return {"ciphertext": "", "nonce": "", "key_version": self.CURRENT_KEY_VERSION}

        nonce = os.urandom(12)  # Standard 96-bit nonce for AES-GCM
        ciphertext_bytes = self.aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)

        return {
            "ciphertext": base64.b64encode(ciphertext_bytes).decode("ascii"),
            "nonce": base64.b64encode(nonce).decode("ascii"),
            "key_version": self.CURRENT_KEY_VERSION,
        }

    def decrypt(self, encrypted_payload: Dict[str, str]) -> str:
        """
        Decrypts an encrypted payload dictionary containing ciphertext and nonce.
        """
        ciphertext_b64 = encrypted_payload.get("ciphertext")
        nonce_b64 = encrypted_payload.get("nonce")

        if not ciphertext_b64 or not nonce_b64:
            return ""

        ciphertext_bytes = base64.b64decode(ciphertext_b64.encode("ascii"))
        nonce_bytes = base64.b64decode(nonce_b64.encode("ascii"))

        plaintext_bytes = self.aesgcm.decrypt(nonce_bytes, ciphertext_bytes, None)
        return plaintext_bytes.decode("utf-8")


token_cipher = TokenCipher()
