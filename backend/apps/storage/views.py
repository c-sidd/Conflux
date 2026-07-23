from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from django.conf import settings
from django.utils import timezone
import requests
from .models import StorageAccount, ActivityLog
from .serializers import StorageAccountSerializer, ActivityLogSerializer
from .manager import StorageManager

class StorageAccountViewSet(viewsets.ModelViewSet):
    serializer_class = StorageAccountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return StorageAccount.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'], url_path='test-connection')
    def test_connection(self, request, pk=None):
        account = self.get_object()
        success = account.refresh_access_token()
        if success:
            try:
                # Test call to Google Drive API
                res = requests.get(
                    "https://www.googleapis.com/drive/v3/about?fields=storageQuota",
                    headers={"Authorization": f"Bearer {account.access_token}"}
                )
                if res.status_code == 200:
                    account.health_status = 'healthy'
                    # Update storage quotas
                    data = res.json().get('storageQuota', {})
                    account.total_storage = int(data.get('limit', 0))
                    account.used_storage = int(data.get('usage', 0))
                    account.save()
                    return Response({"status": "healthy", "message": "Connection tested successfully."})
                else:
                    account.health_status = 'unauthorized'
                    account.save()
                    return Response({"status": "unauthorized", "message": "Google API rejected access."}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                account.health_status = 'offline'
                account.save()
                return Response({"status": "offline", "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"status": "failed", "message": "Failed to refresh OAuth tokens."}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='sync-quota')
    def sync_quota(self, request, pk=None):
        account = self.get_object()
        try:
            manager = StorageManager(self.request.user)
            # Fetch instance provider
            provider = manager._get_provider_instance(account)
            total, used = provider.get_quota()
            account.total_storage = total
            account.used_storage = used
            account.health_status = 'healthy'
            account.save()
            
            # Log sync activity
            ActivityLog.objects.create(
                user=self.request.user,
                action='sync',
                details={'drive_nickname': account.nickname, 'drive_email': account.provider_email}
            )
            return Response(StorageAccountSerializer(account).data)
        except Exception as e:
            account.health_status = 'offline'
            account.save()
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='connect-oauth')
    def connect_oauth(self, request):
        """
        Receives authorization code from frontend and connects the Google Drive account as a storage account.
        """
        code = request.data.get('code')
        redirect_uri = request.data.get('redirect_uri')
        nickname = request.data.get('nickname', 'Google Drive')

        if not code or not redirect_uri:
            return Response({'error': 'code and redirect_uri are required'}, status=status.HTTP_400_BAD_REQUEST)

        # Exchange authorization code for access/refresh tokens
        try:
            token_response = requests.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                }
            )
            
            if token_response.status_code != 200:
                return Response({'error': 'Failed to exchange OAuth code', 'details': token_response.json()}, status=status.HTTP_400_BAD_REQUEST)
            
            tokens = token_response.json()
            access_token = tokens.get('access_token')
            refresh_token = tokens.get('refresh_token') # Sent only on first authentication if offline access is approved
            expires_in = tokens.get('expires_in', 3600)
            granted_scopes = tokens.get('scope', '')
            
            print(f"--- OAUTH TOKEN RESPONSE ---")
            print(f"Granted Scopes: {granted_scopes}")
            print(f"Has Refresh Token: {bool(refresh_token)}")
            print(f"----------------------------")
            
            # Fetch user email associated with this drive account
            profile_response = requests.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if profile_response.status_code != 200:
                return Response({'error': 'Failed to fetch user info for connected drive'}, status=status.HTTP_400_BAD_REQUEST)
                
            profile = profile_response.json()
            email = profile.get('email')
            account_id = profile.get('sub')
            
            if not email:
                return Response({'error': 'Unable to retrieve email from Google Account'}, status=status.HTTP_400_BAD_REQUEST)

            # Fetch drive quota info
            drive_response = requests.get(
                "https://www.googleapis.com/drive/v3/about?fields=storageQuota",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            total_storage = 0
            used_storage = 0
            if drive_response.status_code == 200:
                quota = drive_response.json().get('storageQuota', {})
                total_storage = int(quota.get('limit', 0))
                used_storage = int(quota.get('usage', 0))
            else:
                print(f"--- GOOGLE API ERROR IN OAUTH CONNECT ---")
                print(f"Endpoint: https://www.googleapis.com/drive/v3/about")
                print(f"HTTP Status: {drive_response.status_code}")
                print(f"Response: {drive_response.text}")
                print(f"----------------------------------------")
                # Don't fail the whole connection if quota fetch fails, but log it
                # Wait, actually we want to see it, so raise a ValueError or just log it
                pass

            # Create or update StorageAccount
            defaults = {
                'provider_account_id': account_id,
                'access_token': access_token,
                'token_expiry': timezone.now() + timezone.timedelta(seconds=expires_in),
                'total_storage': total_storage,
                'used_storage': used_storage,
                'health_status': 'healthy',
                'is_active': True,
            }
            # Only update refresh_token if Google sent one (can be null if already connected previously)
            if refresh_token:
                defaults['refresh_token'] = refresh_token

            account, created = StorageAccount.objects.update_or_create(
                user=request.user,
                provider_email=email,
                provider='google',
                defaults=defaults
            )
            
            # If nickname is default and it was just created, assign the user's nickname parameter
            if created or nickname != 'Google Drive':
                account.nickname = nickname
                account.save()

            # Audit connect activity
            ActivityLog.objects.create(
                user=request.user,
                action='connect',
                details={'drive_nickname': account.nickname, 'drive_email': account.provider_email}
            )

            return Response(StorageAccountSerializer(account).data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def perform_destroy(self, instance):
        # Log disconnect activity
        ActivityLog.objects.create(
            user=self.request.user,
            action='disconnect',
            details={'drive_nickname': instance.nickname, 'drive_email': instance.provider_email}
        )
        instance.delete()

class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ActivityLog.objects.filter(user=self.request.user)[:50] # return last 50 entries
