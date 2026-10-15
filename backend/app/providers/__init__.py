from app.core.config import settings
from app.providers.base import BaseStorageProvider
from app.providers.fake_provider import FakeStorageProvider
from app.providers.google_drive import GoogleDriveProvider

_fake_instance = None
_real_instance = None


def get_storage_provider() -> BaseStorageProvider:
    global _fake_instance, _real_instance
    if settings.USE_FAKE_STORAGE_PROVIDER:
        if _fake_instance is None:
            _fake_instance = FakeStorageProvider()
        return _fake_instance
    else:
        if _real_instance is None:
            _real_instance = GoogleDriveProvider()
        return _real_instance


__all__ = ["BaseStorageProvider", "GoogleDriveProvider", "FakeStorageProvider", "get_storage_provider"]
