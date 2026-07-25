from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Folder
from .serializers import FolderSerializer

class FolderViewSet(viewsets.ModelViewSet):
    serializer_class = FolderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Folder.objects.filter(user=self.request.user)

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

