from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from apps.files.models import File
from apps.files.serializers import FileSerializer
from apps.folders.models import Folder
from apps.folders.serializers import FolderSerializer
from apps.storage.manager import StorageManager
from apps.storage.models import ActivityLog
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

class RestoreItemView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        item_type = request.data.get('type', 'file')
        if item_type == 'folder':
            try:
                folder = Folder.objects.get(id=pk, user=request.user, is_trashed=True)
                folder.is_trashed = False
                folder.save()
                return Response({'message': 'Folder restored from trash', 'folder': FolderSerializer(folder).data})
            except Folder.DoesNotExist:
                return Response({'error': 'Trashed folder not found'}, status=status.HTTP_404_NOT_FOUND)
        else:
            try:
                file_obj = File.objects.get(id=pk, user=request.user, is_trashed=True)
                file_obj.is_trashed = False
                file_obj.save()
                ActivityLog.objects.create(
                    user=request.user,
                    action='restore',
                    details={'filename': file_obj.name, 'file_id': file_obj.id}
                )
                return Response({'message': 'File restored from trash', 'file': FileSerializer(file_obj).data})
            except File.DoesNotExist:
                return Response({'error': 'Trashed file not found'}, status=status.HTTP_404_NOT_FOUND)

class PermanentDeleteItemView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk=None):
        item_type = request.query_params.get('type', 'file')
        if item_type == 'folder':
            try:
                folder = Folder.objects.get(id=pk, user=request.user, is_trashed=True)
                folder.delete()
                return Response({'message': 'Folder permanently deleted'})
            except Folder.DoesNotExist:
                return Response({'error': 'Trashed folder not found'}, status=status.HTTP_404_NOT_FOUND)
        else:
            try:
                file_obj = File.objects.get(id=pk, user=request.user, is_trashed=True)
                manager = StorageManager(user=request.user)
                try:
                    manager.delete_file(
                        account_id=file_obj.storage_account.id,
                        provider_file_id=file_obj.provider_file_id,
                        filename=file_obj.name,
                        size=file_obj.size
                    )
                except Exception as e:
                    logger.error(f"Error purging file from Drive {file_obj.name}: {str(e)}")
                file_obj.delete()
                ActivityLog.objects.create(
                    user=request.user,
                    action='permanent_delete',
                    details={'filename': file_obj.name}
                )
                return Response({'message': 'File permanently deleted'})
            except File.DoesNotExist:
                return Response({'error': 'Trashed file not found'}, status=status.HTTP_404_NOT_FOUND)

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
