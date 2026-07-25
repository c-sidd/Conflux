from rest_framework import serializers
from .models import File

from apps.storage.serializers import StorageAccountSerializer

class FileSerializer(serializers.ModelSerializer):
    storage_account = StorageAccountSerializer(read_only=True)

    class Meta:
        model = File
        fields = ['id', 'name', 'folder', 'storage_account', 'size', 'mime_type', 'web_view_link', 'checksum', 'is_favorite', 'is_trashed', 'created_at', 'updated_at']
        read_only_fields = ['id', 'size', 'mime_type', 'web_view_link', 'created_at', 'updated_at']

