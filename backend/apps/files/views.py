import logging
import io
import zipfile
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.http import FileResponse
from .models import File
from .serializers import FileSerializer
from apps.storage.manager import StorageManager
from apps.storage.models import StorageAccount, ActivityLog

logger = logging.getLogger(__name__)

class FileViewSet(viewsets.ModelViewSet):
    serializer_class = FileSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs = File.objects.filter(user=self.request.user).select_related('storage_account')
        include_trashed = self.request.query_params.get('include_trashed', 'false').lower() == 'true'
        if not include_trashed:
            qs = qs.filter(is_trashed=False)
        return qs

    def create(self, request, *args, **kwargs):
        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        folder_id = request.data.get('folder')
        if folder_id:
            try:
                folder_id = int(folder_id)
            except (ValueError, TypeError):
                folder_id = None

        manager = StorageManager(user=request.user)
        
        try:
            upload_result = manager.upload_file(
                file_obj=uploaded_file.file,
                filename=uploaded_file.name,
                mime_type=uploaded_file.content_type,
                size=uploaded_file.size,
                folder_id=folder_id
            )
            
            storage_account = StorageAccount.objects.get(id=upload_result['account_id'])
            
            file_instance = File.objects.create(
                name=uploaded_file.name,
                user=request.user,
                folder_id=folder_id if folder_id else None,
                storage_account=storage_account,
                provider_file_id=upload_result['provider_file_id'],
                size=upload_result['size'],
                mime_type=uploaded_file.content_type,
                web_view_link=upload_result['web_view_link']
            )
            
            serializer = self.get_serializer(file_instance)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error during file upload: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        new_name = request.data.get('name')
        
        if new_name and new_name != instance.name:
            manager = StorageManager(user=request.user)
            renamed = manager.rename_file(instance.storage_account.id, instance.provider_file_id, new_name)
            if renamed:
                ActivityLog.objects.create(
                    user=request.user,
                    action='rename',
                    old_path=instance.name,
                    new_path=new_name,
                    details={'file_id': instance.id, 'drive_nickname': instance.storage_account.nickname}
                )
        
        return super().update(request, *args, **kwargs, partial=partial)

    def perform_destroy(self, instance):
        # Soft delete by default
        instance.is_trashed = True
        instance.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action='delete',
            details={'filename': instance.name, 'size': instance.size, 'file_id': instance.id}
        )

    @action(detail=True, methods=['post'], url_path='move')
    def move(self, request, pk=None):
        file_instance = self.get_object()
        target_folder_id = request.data.get('folder_id')
        if target_folder_id is not None:
            try:
                target_folder_id = int(target_folder_id)
            except (ValueError, TypeError):
                target_folder_id = None

        manager = StorageManager(user=request.user)
        moved_on_drive = manager.move_file(
            account_id=file_instance.storage_account.id,
            provider_file_id=file_instance.provider_file_id,
            target_folder_id=target_folder_id
        )

        old_folder_name = file_instance.folder.name if file_instance.folder else "Root"
        file_instance.folder_id = target_folder_id
        file_instance.save()

        ActivityLog.objects.create(
            user=request.user,
            action='move',
            old_path=old_folder_name,
            new_path=str(target_folder_id or "Root"),
            details={'filename': file_instance.name, 'file_id': file_instance.id}
        )

        return Response({'message': 'File moved successfully', 'file': self.get_serializer(file_instance).data})

    @action(detail=True, methods=['post'], url_path='copy')
    def copy_file(self, request, pk=None):
        file_instance = self.get_object()
        target_folder_id = request.data.get('folder_id')
        if target_folder_id is not None:
            try:
                target_folder_id = int(target_folder_id)
            except (ValueError, TypeError):
                target_folder_id = None

        new_name = request.data.get('name', f"Copy of {file_instance.name}")
        manager = StorageManager(user=request.user)

        copy_result = manager.copy_file(
            account_id=file_instance.storage_account.id,
            provider_file_id=file_instance.provider_file_id,
            new_name=new_name,
            target_folder_id=target_folder_id
        )

        new_file = File.objects.create(
            name=new_name,
            user=request.user,
            folder_id=target_folder_id,
            storage_account=file_instance.storage_account,
            provider_file_id=copy_result['provider_file_id'],
            size=copy_result['size'],
            mime_type=file_instance.mime_type,
            web_view_link=copy_result['web_view_link']
        )

        ActivityLog.objects.create(
            user=request.user,
            action='copy',
            details={'source_file': file_instance.name, 'new_file': new_file.name}
        )

        return Response({'message': 'File copied successfully', 'file': self.get_serializer(new_file).data}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='favorite')
    def toggle_favorite(self, request, pk=None):
        file_instance = self.get_object()
        file_instance.is_favorite = not file_instance.is_favorite
        file_instance.save()
        return Response({'is_favorite': file_instance.is_favorite, 'message': 'Favorite status updated'})

    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        file_instance = File.objects.get(id=pk, user=request.user)
        file_instance.is_trashed = False
        file_instance.save()
        ActivityLog.objects.create(
            user=request.user,
            action='restore',
            details={'filename': file_instance.name, 'file_id': file_instance.id}
        )
        return Response({'message': 'File restored from trash', 'file': self.get_serializer(file_instance).data})

    @action(detail=True, methods=['delete'], url_path='permanent-delete')
    def permanent_delete(self, request, pk=None):
        file_instance = File.objects.get(id=pk, user=request.user)
        manager = StorageManager(user=request.user)
        manager.delete_file(
            account_id=file_instance.storage_account.id,
            provider_file_id=file_instance.provider_file_id,
            filename=file_instance.name,
            size=file_instance.size
        )
        file_instance.delete()
        ActivityLog.objects.create(
            user=request.user,
            action='permanent_delete',
            details={'filename': file_instance.name}
        )
        return Response({'message': 'File permanently deleted'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='bulk-delete')
    def bulk_delete(self, request):
        file_ids = request.data.get('file_ids', [])
        files = File.objects.filter(id__in=file_ids, user=request.user)
        count = files.update(is_trashed=True)
        return Response({'message': f'{count} files moved to trash'})

    @action(detail=False, methods=['post'], url_path='bulk-move')
    def bulk_move(self, request):
        file_ids = request.data.get('file_ids', [])
        target_folder_id = request.data.get('folder_id')
        files = File.objects.filter(id__in=file_ids, user=request.user)
        count = files.update(folder_id=target_folder_id)
        return Response({'message': f'{count} files moved successfully'})

    @action(detail=False, methods=['post'], url_path='bulk-download')
    def bulk_download(self, request):
        file_ids = request.data.get('file_ids', [])
        files = File.objects.filter(id__in=file_ids, user=request.user)
        if not files.exists():
            return Response({'error': 'No files selected'}, status=status.HTTP_400_BAD_REQUEST)

        manager = StorageManager(user=request.user)
        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            for fi in files:
                try:
                    stream = manager.download_file(fi.storage_account.id, fi.provider_file_id)
                    zf.writestr(fi.name, stream.read())
                except Exception as e:
                    logger.error(f"Error zipping bulk download file {fi.name}: {str(e)}")

        zip_buffer.seek(0)
        response = FileResponse(zip_buffer, content_type='application/zip')
        response['Content-Disposition'] = 'attachment; filename="Conflux_Bulk_Download.zip"'
        return response

    @action(detail=False, methods=['post'], url_path='check-duplicate')
    def check_duplicate(self, request):
        filename = request.data.get('name')
        folder_id = request.data.get('folder_id')
        size = request.data.get('size')

        existing = File.objects.filter(
            user=request.user,
            name=filename,
            folder_id=folder_id,
            is_trashed=False
        ).first()

        if existing:
            return Response({
                'exists': True,
                'file_id': existing.id,
                'name': existing.name,
                'size': existing.size
            })

        return Response({'exists': False})

    @action(detail=True, methods=['get'], url_path='download')
    def download(self, request, pk=None):
        file_instance = self.get_object()
        manager = StorageManager(user=request.user)
        try:
            file_stream = manager.download_file(
                account_id=file_instance.storage_account.id,
                provider_file_id=file_instance.provider_file_id
            )
            ActivityLog.objects.create(
                user=request.user,
                action='download',
                details={'filename': file_instance.name, 'file_id': file_instance.id}
            )
            response = FileResponse(file_stream, content_type=file_instance.mime_type or 'application/octet-stream')
            response['Content-Disposition'] = f'attachment; filename="{file_instance.name}"'
            response['Content-Length'] = file_instance.size
            return response
        except Exception as e:
            logger.error(f"Error streaming file download: {str(e)}")
            return Response({'error': f"Download failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='upload-chunk')
    def upload_chunk(self, request):
        import os
        import shutil
        import uuid
        from django.conf import settings
        from django.utils.text import get_valid_filename

        raw_upload_id = request.data.get('upload_id')
        chunk_index = request.data.get('chunk_index')
        total_chunks = request.data.get('total_chunks')
        raw_filename = request.data.get('name')
        folder_id = request.data.get('folder_id')
        mime_type = request.data.get('mime_type', 'application/octet-stream')
        chunk_file = request.FILES.get('file')

        if not all([raw_upload_id, chunk_index is not None, total_chunks is not None, raw_filename, chunk_file]):
            return Response({'error': 'Missing required parameters'}, status=status.HTTP_400_BAD_REQUEST)

        # Security Sanitization: Prevent Path Traversal
        try:
            upload_id = str(uuid.UUID(str(raw_upload_id)))
        except (ValueError, TypeError):
            return Response({'error': 'Invalid upload_id format. Must be a valid UUID.'}, status=status.HTTP_400_BAD_REQUEST)

        filename = get_valid_filename(os.path.basename(str(raw_filename)))
        if not filename:
            filename = f"upload_{upload_id[:8]}.bin"

        try:
            chunk_index = int(chunk_index)
            total_chunks = int(total_chunks)
            if folder_id:
                folder_id = int(folder_id)
        except ValueError:
            return Response({'error': 'Invalid chunk indices or folder id'}, status=status.HTTP_400_BAD_REQUEST)

        # Create temporary storage directory
        temp_dir = os.path.join(settings.BASE_DIR, 'temp_uploads', upload_id)
        os.makedirs(temp_dir, exist_ok=True)

        # Save current chunk to disk
        chunk_path = os.path.join(temp_dir, f'chunk_{chunk_index}')
        with open(chunk_path, 'wb+') as destination:
            for chunk in chunk_file.chunks():
                destination.write(chunk)

        # Check if we have received all chunks
        received_chunks = len([f for f in os.listdir(temp_dir) if f.startswith('chunk_')])
        if received_chunks == total_chunks:
            # Reassemble file
            assembled_path = os.path.join(temp_dir, filename)
            with open(assembled_path, 'wb') as assembled_file:
                for i in range(total_chunks):
                    curr_chunk_path = os.path.join(temp_dir, f'chunk_{i}')
                    if not os.path.exists(curr_chunk_path):
                        return Response({'error': f'Missing chunk index {i}'}, status=status.HTTP_400_BAD_REQUEST)
                    with open(curr_chunk_path, 'rb') as f:
                        assembled_file.write(f.read())

            # Read assembled file into Django file object format
            manager = StorageManager(user=request.user)
            try:
                file_size = os.path.getsize(assembled_path)
                with open(assembled_path, 'rb') as final_file:
                    upload_result = manager.upload_file(
                        file_obj=final_file,
                        filename=filename,
                        mime_type=mime_type,
                        size=file_size,
                        folder_id=folder_id
                    )

                storage_account = StorageAccount.objects.get(id=upload_result['account_id'])

                file_instance = File.objects.create(
                    name=filename,
                    user=request.user,
                    folder_id=folder_id if folder_id else None,
                    storage_account=storage_account,
                    provider_file_id=upload_result['provider_file_id'],
                    size=upload_result['size'],
                    mime_type=mime_type,
                    web_view_link=upload_result['web_view_link']
                )

                # Clean up temporary uploads folder
                shutil.rmtree(temp_dir)

                serializer = self.get_serializer(file_instance)
                return Response(serializer.data, status=status.HTTP_201_CREATED)

            except Exception as e:
                logger.error(f"Error uploading reassembled file: {str(e)}")
                # Clean up temporary folder anyway
                shutil.rmtree(temp_dir, ignore_errors=True)
                return Response({'error': f'Upload assembly failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


        return Response({
            'success': True,
            'message': f'Chunk {chunk_index} received successfully ({received_chunks}/{total_chunks})'
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='simulate')
    def simulate(self, request):
        filename = request.data.get('name')
        file_size = request.data.get('size')
        if not filename or file_size is None:
            return Response({'error': 'name and size are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            file_size = int(file_size)
        except ValueError:
            return Response({'error': 'size must be an integer'}, status=status.HTTP_400_BAD_REQUEST)
        
        manager = StorageManager(user=request.user)
        result = manager.simulate_placement(filename, file_size)
        
        if not result.get('success'):
            return Response({'error': result.get('error')}, status=status.HTTP_400_BAD_REQUEST)
            
        return Response(result, status=status.HTTP_200_OK)


