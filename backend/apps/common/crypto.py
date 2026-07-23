import base64
from django.conf import settings
from cryptography.fernet import Fernet

def get_fernet() -> Fernet:
    # Deriving a Fernet key from the config key (must be 32 bytes URL-safe base64)
    key = settings.ENCRYPTION_KEY.encode('utf-8')
    if len(key) < 32:
        key = key.ljust(32, b'0')
    elif len(key) > 32:
        key = key[:32]
    # Fernet requires a base64 encoded key
    b64_key = base64.urlsafe_b64encode(key)
    return Fernet(b64_key)

def encrypt_token(token: str) -> str:
    if not token:
        return ""
    f = get_fernet()
    return f.encrypt(token.encode('utf-8')).decode('utf-8')

def decrypt_token(encrypted_token: str) -> str:
    if not encrypted_token:
        return ""
    f = get_fernet()
    return f.decrypt(encrypted_token.encode('utf-8')).decode('utf-8')
