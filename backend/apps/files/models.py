from django.db import models
from django.conf import settings

class File(models.Model):
    name = models.CharField(max_length=255)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='files')
    folder = models.ForeignKey('folders.Folder', on_delete=models.CASCADE, null=True, blank=True, related_name='files')
    
    # Storage routing mapping
    storage_account = models.ForeignKey('storage.StorageAccount', on_delete=models.PROTECT, related_name='files')
    provider_file_id = models.CharField(max_length=255) # The actual ID on Google Drive/Dropbox
    
    size = models.BigIntegerField(default=0)
    mime_type = models.CharField(max_length=255, default='application/octet-stream')
    web_view_link = models.URLField(max_length=1024, blank=True, null=True)

    checksum = models.CharField(max_length=64, blank=True, null=True)
    is_favorite = models.BooleanField(default=False)
    is_trashed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('name', 'folder', 'user') # Name must be unique within a folder per user
        indexes = [
            models.Index(fields=['user', 'folder', 'is_trashed']),
            models.Index(fields=['user', 'is_favorite', 'is_trashed']),
        ]

    def __str__(self):
        return f"{self.name} (ID: {self.provider_file_id})"
