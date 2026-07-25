from django.db import models
from django.conf import settings
from apps.common.crypto import encrypt_token, decrypt_token
import requests
from django.utils import timezone
from datetime import timedelta

class StorageAccount(models.Model):
    PROVIDER_CHOICES = (
        ('google', 'Google Drive'),
        ('dropbox', 'Dropbox'),
        ('onedrive', 'OneDrive'),
        ('s3', 'Amazon S3'),
    )

    HEALTH_CHOICES = (
        ('healthy', 'Healthy'),
        ('quota_full', 'Quota Full'),
        ('unauthorized', 'Unauthorized'),
        ('expired_token', 'Expired Token'),
        ('rate_limited', 'Rate Limited'),
        ('disconnected', 'Disconnected'),
        ('syncing', 'Syncing'),
        ('offline', 'Offline'),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='storage_accounts')
    provider = models.CharField(max_length=50, choices=PROVIDER_CHOICES, default='google')
    nickname = models.CharField(max_length=255, default='My Cloud Storage')
    provider_email = models.EmailField()
    provider_account_id = models.CharField(max_length=255, blank=True, null=True)
    workspace_folder_id = models.CharField(max_length=255, blank=True, null=True)

    # Encrypted fields
    encrypted_access_token = models.TextField()
    encrypted_refresh_token = models.TextField(blank=True, null=True)
    
    token_expiry = models.DateTimeField(blank=True, null=True)
    
    total_storage = models.BigIntegerField(default=0) # in bytes
    used_storage = models.BigIntegerField(default=0) # in bytes

    health_status = models.CharField(max_length=50, choices=HEALTH_CHOICES, default='healthy')
    last_sync = models.DateTimeField(auto_now=True)
    
    is_active = models.BooleanField(default=True)
    deactivated_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'provider_email', 'provider')

    def __str__(self):
        return f"{self.nickname} ({self.provider_email})"

    @property
    def free_storage(self):
        return max(0, self.total_storage - self.used_storage)

    # Encrypted Access Token Get/Set
    @property
    def access_token(self) -> str:
        return decrypt_token(self.encrypted_access_token)

    @access_token.setter
    def access_token(self, value: str):
        self.encrypted_access_token = encrypt_token(value)

    # Encrypted Refresh Token Get/Set
    @property
    def refresh_token(self) -> str:
        return decrypt_token(self.encrypted_refresh_token)

    @refresh_token.setter
    def refresh_token(self, value: str):
        self.encrypted_refresh_token = encrypt_token(value)

    def refresh_access_token(self):
        """
        Refresh expired Google access tokens automatically.
        """
        # Only refresh if it's expired or about to expire in 5 minutes
        if self.token_expiry and self.token_expiry > timezone.now() + timedelta(minutes=5):
            return True

        if self.provider == 'google' and self.refresh_token:
            try:
                response = requests.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "client_id": settings.GOOGLE_CLIENT_ID,
                        "client_secret": settings.GOOGLE_CLIENT_SECRET,
                        "refresh_token": self.refresh_token,
                        "grant_type": "refresh_token",
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    self.access_token = data["access_token"]
                    expires_in = data.get("expires_in", 3600)
                    self.token_expiry = timezone.now() + timedelta(seconds=expires_in)
                    self.health_status = 'healthy'
                    self.save()
                    return True
                else:
                    self.health_status = 'expired_token'
                    self.save()
                    return False
            except Exception:
                self.health_status = 'offline'
                self.save()
                return False
        return False

class ActivityLog(models.Model):
    ACTION_CHOICES = (
        ('upload', 'File Uploaded'),
        ('download', 'File Downloaded'),
        ('rename', 'Item Renamed'),
        ('move', 'Item Moved'),
        ('copy', 'Item Copied'),
        ('delete', 'Item Soft Deleted'),
        ('restore', 'Item Restored'),
        ('permanent_delete', 'Item Permanently Deleted'),
        ('connect', 'Drive Connected'),
        ('disconnect', 'Drive Disconnected'),
        ('sync', 'Quota Refreshed'),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='activity_logs')
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    old_path = models.CharField(max_length=1024, blank=True, null=True)
    new_path = models.CharField(max_length=1024, blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    details = models.JSONField(default=dict)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.email} - {self.action} - {self.timestamp}"

