import logging
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import FileResponse
from .models import Folder, StorageFolder
from .serializers import FolderSerializer
from apps.files.models import File
from apps.storage.manager import StorageManager
from apps.storage.models import ActivityLog

logger = logging.getLogger(__name__)

class FolderViewSet(viewsets.ModelViewSet):
    serializer_class = FolderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Folder.objects.filter(user=self.request.user).select_related('parent')
        include_trashed = self.request.query_params.get('include_trashed', 'false').lower() == 'true'
        if not include_trashed:
            qs = qs.filter(is_trashed=False)
        return qs

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        new_name = request.data.get('name')
        new_parent_val = request.data.get('parent')
        parent_changed = False
        new_parent_id = None
        if 'parent' in request.data:
            try:
                new_parent_id = int(new_parent_val) if new_parent_val is not None else None
            except (ValueError, TypeError):
                return Response({'error': 'Invalid parent folder.'}, status=status.HTTP_400_BAD_REQUEST)
            old_parent_id = instance.parent.id if instance.parent else None
            parent_changed = new_parent_id != old_parent_id

        manager = StorageManager(user=request.user)

        if new_name and new_name != instance.name:
            try:
                if not manager.rename_folder(instance.id, new_name):
                    return Response({'error': 'Provider failed to rename folder.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            except Exception:
                logger.exception("Provider folder rename failed for folder %s", instance.id)
                return Response({'error': 'Provider failed to rename folder.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if parent_changed:
            try:
                if not manager.move_folder(instance.id, new_parent_id):
                    return Response({'error': 'Provider failed to move folder.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            except Exception:
                logger.exception("Provider folder move failed for folder %s", instance.id)
                return Response({'error': 'Provider failed to move folder.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return super().update(request, *args, **kwargs, partial=partial)

    def perform_destroy(self, instance):
        instance.is_trashed = True
        instance.save()

        def trash_subfolders(parent):
            subfolders = Folder.objects.filter(parent=parent, user=self.request.user)
            for sf in subfolders:
                sf.is_trashed = True
                sf.save()
                File.objects.filter(folder=sf, user=self.request.user).update(is_trashed=True)
                trash_subfolders(sf)

        File.objects.filter(folder=instance, user=self.request.user).update(is_trashed=True)
        trash_subfolders(instance)
        ActivityLog.objects.create(
            user=self.request.user,
            action='delete',
            details={'folder_name': instance.name, 'folder_id': instance.id}
        )

    @action(detail=True, methods=['get'], url_path='breadcrumb')
    def breadcrumb(self, request, pk=None):
        folder = self.get_object()
        chain = []
        curr = folder
        visited = set()
        while curr:
            if curr.id in visited:
                return Response({'error': 'Folder hierarchy contains a cycle.'}, status=status.HTTP_409_CONFLICT)
            visited.add(curr.id)
            chain.append({'id': curr.id, 'name': curr.name, 'parent': curr.parent.id if curr.parent else None})
            curr = curr.parent
        chain.reverse()
        return Response(chain)

    @action(detail=True, methods=['post'], url_path='move')
    def move(self, request, pk=None):
        folder = self.get_object()
        new_parent_id = request.data.get('parent_id')
        if new_parent_id is not None:
            try:
                new_parent_id = int(new_parent_id)
            except (ValueError, TypeError):
                return Response({'error': 'Invalid parent folder.'}, status=status.HTTP_400_BAD_REQUEST)

        if new_parent_id == folder.id:
            return Response({'error': 'Cannot move folder inside itself'}, status=status.HTTP_400_BAD_REQUEST)

        if new_parent_id is not None:
            target_parent = Folder.objects.filter(id=new_parent_id, user=request.user).first()
            if target_parent is None:
                return Response({'error': 'Target folder not found.'}, status=status.HTTP_404_NOT_FOUND)
            curr = target_parent
            while curr:
                if curr.id == folder.id:
                    return Response({'error': 'Cannot move folder into its own descendant'}, status=status.HTTP_400_BAD_REQUEST)
                curr = curr.parent

        manager = StorageManager(user=request.user)
        try:
            if not manager.move_folder(folder.id, new_parent_id):
                return Response({'error': 'Provider failed to move folder.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception:
            logger.exception("Provider folder move failed for folder %s", folder.id)
            return Response({'error': 'Provider failed to move folder.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        folder.parent_id = new_parent_id
        folder.save(update_fields=['parent', 'updated_at'])
        ActivityLog.objects.create(
            user=request.user,
            action='move',
            details={'folder_name': folder.name, 'new_parent_id': new_parent_id}
        )
        return Response({'message': 'Folder moved successfully', 'folder': self.get_serializer(folder).data})

    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        folder = Folder.objects.get(id=pk, user=request.user)
        folder.is_trashed = False
        folder.save()

        def restore_subfolders(parent):
            subfolders = Folder.objects.filter(parent=parent, user=request.user)
            for sf in subfolders:
                sf.is_trashed = False
                sf.save()
                File.objects.filter(folder=sf, user=request.user).update(is_trashed=False)
                restore_subfolders(sf)

        File.objects.filter(folder=folder, user=request.user).update(is_trashed=False)
        restore_subfolders(folder)
        ActivityLog.objects.create(user=request.user, action='restore', details={'folder_name': folder.name, 'folder_id': folder.id})
        return Response({'message': 'Folder restored from trash', 'folder': self.get_serializer(folder).data})

    @action(detail=True, methods=['delete'], url_path='permanent-delete')
    def permanent_delete(self, request, pk=None):
        folder = Folder.objects.get(id=pk, user=request.user)
        manager = StorageManager(user=request.user)
        folder_name = folder.name

        def purge_folder_contents(f):
            for fi in File.objects.filter(folder=f, user=request.user):
                success = manager.delete_file(fi.storage_account.id, fi.provider_file_id, fi.name, fi.size)
                if not success:
                    raise RuntimeError(f"Provider failed to delete file {fi.id}")
                fi.delete()

            for sub in Folder.objects.filter(parent=f, user=request.user):
                purge_folder_contents(sub)
                sub.delete()

            for mapping in StorageFolder.objects.filter(folder=f):
                provider = manager._get_provider_instance(mapping.storage_account)
                if not provider.delete_file(mapping.provider_folder_id):
                    raise RuntimeError(f"Provider failed to delete folder mapping {mapping.id}")
                mapping.delete()

        try:
            purge_folder_contents(folder)
            folder.delete()
        except Exception:
            logger.exception("Permanent folder deletion failed for folder %s", folder.id)
            return Response({'error': 'Folder could not be permanently deleted because a storage provider operation failed.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        ActivityLog.objects.create(user=request.user, action='permanent_delete', details={'folder_name': folder_name})
        return Response({'message': 'Folder permanently deleted'})

    @action(detail=True, methods=['get'], url_path='download-zip')
    def download_zip(self, request, pk=None):
        folder = self.get_object()
        manager = StorageManager(user=request.user)
        try:
            zip_stream = manager.zip_folder_stream(folder.id)
            response = FileResponse(zip_stream, content_type='application/zip')
            response['Content-Disposition'] = f'attachment; filename="{folder.name}.zip"'
            return response
        except Exception:
            logger.exception("Failed to generate ZIP for folder %s", folder.id)
            return Response({'error': 'Failed to generate folder ZIP.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
