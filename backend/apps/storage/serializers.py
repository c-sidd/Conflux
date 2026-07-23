from rest_framework import serializers
from .models import StorageAccount, ActivityLog

class StorageAccountSerializer(serializers.ModelSerializer):
    free_storage = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = StorageAccount
        fields = [
            'id', 'nickname', 'provider', 'provider_email', 'provider_account_id',
            'total_storage', 'used_storage', 'free_storage', 'health_status', 'last_sync', 'created_at'
        ]
        read_only_fields = ['id', 'provider', 'provider_email', 'provider_account_id', 'total_storage', 'used_storage', 'health_status', 'last_sync', 'created_at']

class ActivityLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLog
        fields = ['id', 'action', 'details', 'timestamp']
