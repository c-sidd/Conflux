from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
from apps.files.models import File
from apps.files.serializers import FileSerializer
from apps.folders.models import Folder
from apps.folders.serializers import FolderSerializer

class SearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({'files': [], 'folders': []})

        files_qs = File.objects.filter(user=request.user, is_trashed=False)
        folders_qs = Folder.objects.filter(user=request.user, is_trashed=False)

        # Parse structured query syntax (e.g. type:pdf folder:AI size>100MB modified:today)
        tokens = query.split()
        clean_query_terms = []

        for token in tokens:
            if token.startswith("type:"):
                ext = token.split(":", 1)[1].lower()
                files_qs = files_qs.filter(name__iendswith=f".{ext}")
            elif token.startswith("folder:"):
                f_name = token.split(":", 1)[1]
                files_qs = files_qs.filter(folder__name__icontains=f_name)
            elif token.startswith("storage:"):
                s_name = token.split(":", 1)[1]
                files_qs = files_qs.filter(storage_account__nickname__icontains=s_name)
            elif token == "modified:today":
                today = timezone.now().date()
                files_qs = files_qs.filter(updated_at__date=today)
                folders_qs = folders_qs.filter(updated_at__date=today)
            elif token.startswith("size>"):
                val_str = token.split(">", 1)[1].lower()
                size_bytes = self._parse_size(val_str)
                if size_bytes > 0:
                    files_qs = files_qs.filter(size__gt=size_bytes)
            else:
                clean_query_terms.append(token)

        if clean_query_terms:
            text_query = " ".join(clean_query_terms)
            files_qs = files_qs.filter(Q(name__icontains=text_query) | Q(mime_type__icontains=text_query))
            folders_qs = folders_qs.filter(name__icontains=text_query)

        files_serializer = FileSerializer(files_qs[:30], many=True)
        folders_serializer = FolderSerializer(folders_qs[:20], many=True)

        return Response({
            'files': files_serializer.data,
            'folders': folders_serializer.data,
            'total_files': files_qs.count(),
            'total_folders': folders_qs.count()
        })

    def _parse_size(self, size_str: str) -> int:
        try:
            if size_str.endswith("mb"):
                return int(float(size_str.replace("mb", "")) * 1024 * 1024)
            if size_str.endswith("gb"):
                return int(float(size_str.replace("gb", "")) * 1024 * 1024 * 1024)
            if size_str.endswith("kb"):
                return int(float(size_str.replace("kb", "")) * 1024)
            return int(size_str)
        except ValueError:
            return 0
