from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.storage.models import StorageAccount, ActivityLog
from apps.storage.serializers import StorageAccountSerializer
from apps.files.models import File
from apps.files.serializers import FileSerializer

class DeveloperDiagnosticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        accounts = StorageAccount.objects.filter(user=request.user)
        accounts_data = StorageAccountSerializer(accounts, many=True).data

        last_file = File.objects.filter(user=request.user).order_by('-created_at').first()
        last_file_data = FileSerializer(last_file).data if last_file else None

        last_activity = ActivityLog.objects.filter(user=request.user).order_by('-timestamp').first()
        last_activity_data = {
            'action': last_activity.action,
            'details': last_activity.details,
            'timestamp': last_activity.timestamp
        } if last_activity else None

        return Response({
            'storage_manager_active_accounts': accounts.filter(is_active=True, health_status='healthy').count(),
            'total_connected_accounts': accounts.count(),
            'accounts': accounts_data,
            'last_upload': last_file_data,
            'last_activity': last_activity_data,
            'workspace_root_name': 'DCS_Workspace',
            'environment': 'development'
        })
