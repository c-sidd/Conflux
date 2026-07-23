from rest_framework import serializers
from .models import File

class FileSerializer(serializers.ModelSerializer):
    class Meta:
        model = File
        fields = ['id', 'name', 'folder', 'size', 'mime_type', 'web_view_link', 'is_trashed', 'created_at', 'updated_at']
        read_only_fields = ['id', 'size', 'mime_type', 'web_view_link', 'created_at', 'updated_at']
