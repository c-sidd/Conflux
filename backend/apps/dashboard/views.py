from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from apps.storage.models import StorageAccount
from apps.files.models import File
from apps.folders.models import Folder
from django.db.models import Sum

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Connected Accounts metrics
        accounts = StorageAccount.objects.filter(user=user, is_active=True)
        total_drives = accounts.count()
        
        # We only aggregate storage from healthy accounts
        healthy_accounts = accounts.filter(health_status='healthy')
        
        storage_stats = healthy_accounts.aggregate(
            total=Sum('total_storage'),
            used=Sum('used_storage')
        )
        
        total_storage = storage_stats.get('total') or 0
        used_storage = storage_stats.get('used') or 0
        remaining_storage = max(0, total_storage - used_storage)
        
        # Files and Folders metrics
        total_files = File.objects.filter(user=user, is_trashed=False).count()
        total_folders = Folder.objects.filter(user=user).count()
        
        # Detailed Drive Breakdown
        drives_breakdown = []
        for acc in accounts:
            drives_breakdown.append({
                'id': acc.id,
                'email': acc.provider_email,
                'nickname': acc.nickname,
                'provider': acc.provider,
                'total': acc.total_storage,
                'used': acc.used_storage,
                'remaining': acc.free_storage,
                'percentage': round((acc.used_storage / acc.total_storage * 100), 2) if acc.total_storage > 0 else 0,
                'health': acc.health_status,
                'last_sync': acc.last_sync
            })
            
        # Storage Insights by file category
        # Standard categories
        categories = {
            'Videos': ['mp4', 'mkv', 'avi', 'mov', 'flv', 'wmv'],
            'Images': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'],
            'Documents': ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'],
            'Archives': ['zip', 'rar', '7z', 'tar', 'gz'],
        }
        
        insights = {
            'Videos': 0,
            'Images': 0,
            'Documents': 0,
            'Archives': 0,
            'Others': 0
        }
        
        user_files = File.objects.filter(user=user, is_trashed=False)
        for file in user_files:
            # Detect extension from filename or mime type
            ext = file.name.split('.')[-1].lower() if '.' in file.name else ''
            matched = False
            for cat, extensions in categories.items():
                if ext in extensions or file.mime_type.split('/')[-1] in extensions:
                    insights[cat] += file.size
                    matched = True
                    break
            if not matched:
                insights['Others'] += file.size

        insights_list = [{'category': k, 'size': v} for k, v in insights.items()]

        return Response({
            'total_storage': total_storage,
            'used_storage': used_storage,
            'remaining_storage': remaining_storage,
            'connected_drives': total_drives,
            'total_files': total_files,
            'total_folders': total_folders,
            'drives_breakdown': drives_breakdown,
            'insights': insights_list
        }, status=status.HTTP_200_OK)
