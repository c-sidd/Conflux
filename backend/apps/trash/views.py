from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from apps.files.models import File
from apps.files.serializers import FileSerializer
from apps.folders.models import Folder
from apps.folders.serializers import FolderSerializer
from apps.storage.manager import StorageManager
import logging

logger = logging.getLogger(__name__)

class TrashListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        trashed_files = File.objects.filter(user=request.user, is_trashed=True)
        trashed_folders = Folder.objects.filter(user=request.user, is_trashed=True)
        
        file_serializer = FileSerializer(trashed_files, many=True)
        folder_serializer = FolderSerializer(trashed_folders, many=True)
        
        return Response({
            'files': file_serializer.data,
            'folders': folder_serializer.data,
            'total_items': trashed_files.count() + trashed_folders.count()
        })

class EmptyTrashView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        manager = StorageManager(user=request.user)
        trashed_files = File.objects.filter(user=request.user, is_trashed=True)
        trashed_folders = Folder.objects.filter(user=request.user, is_trashed=True)

        files_purged = 0
        for fi in trashed_files:
            try:
                manager.delete_file(fi.storage_account.id, fi.provider_file_id, fi.name, fi.size)
            except Exception as e:
                logger.error(f"Error purging trashed file {fi.name}: {str(e)}")
            fi.delete()
            files_purged += 1

        folders_purged = trashed_folders.count()
        trashed_folders.delete()

        ActivityLog.objects.create(
            user=request.user,
            action='permanent_delete',
            details={'files_purged': files_purged, 'folders_purged': folders_purged}
        )

        return Response({
            'message': 'Trash emptied successfully',
            'files_purged': files_purged,
            'folders_purged': folders_purged
        }, status=status.HTTP_200_OK)
