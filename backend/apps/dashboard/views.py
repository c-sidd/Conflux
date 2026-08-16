from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.db.models import Sum, Q
from apps.storage.models import StorageAccount
from apps.files.models import File
from apps.folders.models import Folder


class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        accounts = StorageAccount.objects.filter(user=user, is_active=True)
        total_drives = accounts.count()

        healthy_accounts = accounts.filter(health_status='healthy')
        storage_stats = healthy_accounts.aggregate(
            total=Sum('total_storage'),
            used=Sum('used_storage')
        )

        total_storage = storage_stats.get('total') or 0
        used_storage = storage_stats.get('used') or 0
        remaining_storage = max(0, total_storage - used_storage)

        user_files = File.objects.filter(user=user, is_trashed=False)
        total_files = user_files.count()
        total_folders = Folder.objects.filter(user=user).count()

        # Aggregate category sizes in SQL instead of loading every file into
        # Python. This becomes important as a user's virtual filesystem grows.
        video_q = Q(name__iregex=r'\.(mp4|mkv|avi|mov|flv|wmv)$')
        image_q = Q(name__iregex=r'\.(jpg|jpeg|png|gif|bmp|svg|webp)$')
        document_q = Q(name__iregex=r'\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv)$')
        archive_q = Q(name__iregex=r'\.(zip|rar|7z|tar|gz)$')

        category_totals = user_files.aggregate(
            videos=Sum('size', filter=video_q),
            images=Sum('size', filter=image_q),
            documents=Sum('size', filter=document_q),
            archives=Sum('size', filter=archive_q),
        )

        videos = category_totals.get('videos') or 0
        images = category_totals.get('images') or 0
        documents = category_totals.get('documents') or 0
        archives = category_totals.get('archives') or 0
        categorized = videos + images + documents + archives
        others = max(0, (user_files.aggregate(total=Sum('size')).get('total') or 0) - categorized)

        drives_breakdown = [
            {
                'id': acc.id,
                'email': acc.provider_email,
                'nickname': acc.nickname,
                'provider': acc.provider,
                'total': acc.total_storage,
                'used': acc.used_storage,
                'remaining': acc.free_storage,
                'percentage': round((acc.used_storage / acc.total_storage * 100), 2) if acc.total_storage > 0 else 0,
                'health': acc.health_status,
                'last_sync': acc.last_sync,
            }
            for acc in accounts
        ]

        insights_list = [
            {'category': 'Videos', 'size': videos},
            {'category': 'Images', 'size': images},
            {'category': 'Documents', 'size': documents},
            {'category': 'Archives', 'size': archives},
            {'category': 'Others', 'size': others},
        ]

        return Response({
            'total_storage': total_storage,
            'used_storage': used_storage,
            'remaining_storage': remaining_storage,
            'connected_drives': total_drives,
            'total_files': total_files,
            'total_folders': total_folders,
            'drives_breakdown': drives_breakdown,
            'insights': insights_list,
        }, status=status.HTTP_200_OK)
