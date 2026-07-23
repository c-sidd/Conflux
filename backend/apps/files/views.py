from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import File
from .serializers import FileSerializer
from apps.storage.manager import StorageManager
from apps.storage.models import StorageAccount

class FileViewSet(viewsets.ModelViewSet):
    serializer_class = FileSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return File.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        folder_id = request.data.get('folder')
        
        # We need a StorageManager instance
        manager = StorageManager(user=request.user)
        
        try:
            # Upload file to the best cloud storage account
            upload_result = manager.upload_file(
                file_obj=uploaded_file.file,
                filename=uploaded_file.name,
                mime_type=uploaded_file.content_type,
                size=uploaded_file.size
            )
            
            # Create File model instance
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
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def perform_destroy(self, instance):
        # We also need to delete from physical storage
        manager = StorageManager(user=self.request.user)
        manager.delete_file(
            account_id=instance.storage_account.id, 
            provider_file_id=instance.provider_file_id,
            size=instance.size
        )
        instance.delete()
