import logging
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import File
from .serializers import FileSerializer
from apps.storage.manager import StorageManager
from apps.storage.models import StorageAccount

logger = logging.getLogger(__name__)

class FileViewSet(viewsets.ModelViewSet):
    serializer_class = FileSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return File.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        print(f"\n================ [FILE UPLOAD REQUEST LOG] ================")
        print(f"Request Content-Type: {request.content_type}")
        print(f"Request FILES: {request.FILES}")
        print(f"Request Data: {request.data}")
        print(f"===========================================================\n")
        
        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            print("ERROR: No file provided in request.FILES under 'file' key.")
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        folder_id = request.data.get('folder')
        manager = StorageManager(user=request.user)
        
        try:
            print(f"Uploading file '{uploaded_file.name}' ({uploaded_file.size} bytes, mime: {uploaded_file.content_type})...")
            upload_result = manager.upload_file(
                file_obj=uploaded_file.file,
                filename=uploaded_file.name,
                mime_type=uploaded_file.content_type,
                size=uploaded_file.size
            )
            print(f"Upload Result: {upload_result}")
            
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
            print(f"File model created successfully with ID: {file_instance.id}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"ERROR DURING FILE UPLOAD: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def perform_destroy(self, instance):
        manager = StorageManager(user=self.request.user)
        manager.delete_file(
            account_id=instance.storage_account.id, 
            provider_file_id=instance.provider_file_id,
            filename=instance.name,
            size=instance.size
        )
        instance.delete()

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
