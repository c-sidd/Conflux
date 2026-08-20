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
        
        # parent can be passed as an integer ID or None
        new_parent_val = request.data.get('parent')
        
        # Determine if parent has changed
        parent_changed = False
        new_parent_id = None
        if 'parent' in request.data:
            try:
                new_parent_id = int(new_parent_val) if new_parent_val is not None else None
            except (ValueError, TypeError):
                new_parent_id = None
            
            old_parent_id = instance.parent.id if instance.parent else None
            if new_parent_id != old_parent_id:
                parent_changed = True

        manager = StorageManager(user=request.user)

        # Handle provider folder rename
        if new_name and new_name != instance.name:
            try:
                success = manager.rename_folder(instance.id, new_name)
                if not success:
                    return Response({'error': 'Provider failed to rename folder.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            except Exception as e:
                return Response({'error': f'Provider failed to rename folder: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            ActivityLog.objects.create(
                user=request.user,
                action='rename',
                old_path=instance.name,
                new_path=new_name,
                details={'folder_id': instance.id}
            )

        # Handle provider folder move
        if parent_changed:
            try:
                success = manager.move_folder(instance.id, new_parent_id)
                if not success:
                    return Response({'error': 'Provider failed to move folder.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            except Exception as e:
                return Response({'error': f'Provider failed to move folder: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            ActivityLog.objects.create(
                user=request.user,
                action='move',
                details={'folder_name': instance.name, 'new_parent_id': new_parent_id}
            )

        return super().update(request, *args, **kwargs, partial=partial)

    def perform_destroy(self, instance):
        # Soft delete folder and sub-items
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
        while curr:
            chain.append({
                'id': curr.id,
                'name': curr.name,
                'parent': curr.parent.id if curr.parent else None,
            })
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
                new_parent_id = None

        if new_parent_id == folder.id:
            return Response({'error': 'Cannot move folder inside itself'}, status=status.HTTP_400_BAD_REQUEST)

        # Check cycle prevention
        curr = Folder.objects.filter(id=new_parent_id, user=request.user).first()
        while curr:
            if curr.id == folder.id:
                return Response({'error': 'Cannot move folder into its own descendant'}, status=status.HTTP_400_BAD_REQUEST)
            curr = curr.parent

        manager = StorageManager(user=request.user)
        try:
            success = manager.move_folder(folder.id, new_parent_id)
            if not success:
                return Response({'error': 'Provider failed to move folder.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({'error': f'Provider failed to move folder: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        folder.parent_id = new_parent_id
        folder.save()

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

        ActivityLog.objects.create(
            user=request.user,
            action='restore',
            details={'folder_name': folder.name, 'folder_id': folder.id}
        )

        return Response({'message': 'Folder restored from trash', 'folder': self.get_serializer(folder).data})

    @action(detail=True, methods=['delete'], url_path='permanent-delete')
    def permanent_delete(self, request, pk=None):
        folder = Folder.objects.get(id=pk, user=request.user)
        manager = StorageManager(user=request.user)

        # Delete physical files & folder mappings
        def purge_folder_contents(f):
            # 1. Delete all files in this folder
            for fi in File.objects.filter(folder=f, user=request.user):
                manager.delete_file(fi.storage_account.id, fi.provider_file_id, fi.name, fi.size)
                fi.delete()
            
            # 2. Recursively purge subfolders
            for sub in Folder.objects.filter(parent=f, user=request.user):
                purge_folder_contents(sub)
                sub.delete()

            # 3. Delete physical folders on provider for this folder
            from apps.folders.models import StorageFolder
            for mapping in StorageFolder.objects.filter(folder=f):
                try:
                    provider = manager._get_provider_instance(mapping.storage_account)
                    provider.delete_file(mapping.provider_folder_id)
                except Exception as e:
                    logger.error(f"Failed to delete physical folder {f.name} on provider: {str(e)}")

        purge_folder_contents(folder)
        folder.delete()

        ActivityLog.objects.create(
            user=request.user,
            action='permanent_delete',
            details={'folder_name': folder.name}
        )

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
        except Exception as e:
            return Response({'error': f"Failed to generate ZIP: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
