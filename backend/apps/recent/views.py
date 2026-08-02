from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta
from apps.files.models import File
from apps.files.serializers import FileSerializer
from apps.folders.models import Folder
from apps.folders.serializers import FolderSerializer

class RecentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_start = today_start - timedelta(days=1)
        this_week_start = today_start - timedelta(days=7)

        files = File.objects.filter(user=request.user, is_trashed=False).select_related('storage_account').order_by('-updated_at')[:50]
        folders = Folder.objects.filter(user=request.user, is_trashed=False).select_related('parent').order_by('-updated_at')[:30]

        file_serializer = FileSerializer(files, many=True)
        folder_serializer = FolderSerializer(folders, many=True)

        return Response({
            'all_files': file_serializer.data,
            'all_folders': folder_serializer.data,
        })
