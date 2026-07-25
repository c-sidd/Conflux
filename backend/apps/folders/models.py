from django.db import models
from django.conf import settings

class Folder(models.Model):
    name = models.CharField(max_length=255)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='folders')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subfolders')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('name', 'parent', 'user') # A user cannot have two folders with same name in the same parent

    def __str__(self):
        return f"{self.name} (User: {self.user.email})"

class StorageFolder(models.Model):
    folder = models.ForeignKey(Folder, on_delete=models.CASCADE, related_name='storage_mappings')
    storage_account = models.ForeignKey('storage.StorageAccount', on_delete=models.CASCADE, related_name='folder_mappings')
    provider_folder_id = models.CharField(max_length=255)

    class Meta:
        unique_together = ('folder', 'storage_account')

    def __str__(self):
        return f"{self.folder.name} -> {self.storage_account.nickname} ({self.provider_folder_id})"

