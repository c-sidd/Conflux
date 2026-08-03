import logging
import requests
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from django.conf import settings
from django.utils import timezone
from .models import StorageAccount, ActivityLog
from .serializers import StorageAccountSerializer, ActivityLogSerializer
from .manager import StorageManager

logger = logging.getLogger(__name__)


class StorageAccountViewSet(viewsets.ModelViewSet):
    serializer_class = StorageAccountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return StorageAccount.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'], url_path='test-connection')
    def test_connection(self, request, pk=None):
        account = self.get_object()
        logger.info(f"Testing connection for StorageAccount #{account.id} ({account.nickname})")

        success = account.refresh_access_token()
        if not success:
            logger.warning(f"Failed to refresh OAuth token for account #{account.id}")
            account.health_status = 'expired_token'
            account.save()
            return Response({"status": "failed", "message": "Failed to refresh OAuth tokens."}, status=status.HTTP_400_BAD_REQUEST)

        token = account.access_token
        url = "https://www.googleapis.com/drive/v3/about?fields=storageQuota"

        try:
            res = requests.get(url, headers={"Authorization": f"Bearer {token}"})
            logger.info(f"Google Drive API response status: {res.status_code}")

            if res.status_code == 200:
                account.health_status = 'healthy'
                data = res.json().get('storageQuota', {})
                account.total_storage = int(data.get('limit') or 0)
                account.used_storage = int(data.get('usage') or 0)
                account.save()
                logger.info(f"Connection test successful for account #{account.id}")
                return Response({"status": "healthy", "message": "Connection tested successfully.", "quota": data})
            else:
                err_data = res.json().get('error', {})
                msg = err_data.get('message', res.text)
                account.health_status = 'unauthorized' if res.status_code == 401 else 'offline'
                account.save()
                logger.warning(f"Google API error for account #{account.id}: {msg}")
                return Response({"status": "error", "http_status": res.status_code, "google_error": err_data, "message": msg}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception(f"Exception during test connection for account #{account.id}")
            account.health_status = 'offline'
            account.save()
            return Response({"status": "exception", "error": "An internal error occurred while testing the connection."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='sync-quota')
    def sync_quota(self, request, pk=None):
        account = self.get_object()
        logger.info(f"Syncing quota for StorageAccount #{account.id} ({account.nickname})")

        account.refresh_access_token()
        token = account.access_token
        url = "https://www.googleapis.com/drive/v3/about?fields=storageQuota"

        try:
            res = requests.get(url, headers={"Authorization": f"Bearer {token}"})
            logger.info(f"Quota sync API response status: {res.status_code}")

            if res.status_code == 200:
                data = res.json().get('storageQuota', {})
                account.total_storage = int(data.get('limit') or 0)
                account.used_storage = int(data.get('usage') or 0)
                account.health_status = 'healthy'
                account.save()

                ActivityLog.objects.create(
                    user=self.request.user,
                    action='sync',
                    details={'drive_nickname': account.nickname, 'drive_email': account.provider_email}
                )
                logger.info(f"Quota sync successful for account #{account.id}")
                return Response(StorageAccountSerializer(account).data)
            else:
                err_data = res.json().get('error', {})
                msg = err_data.get('message', res.text)
                account.health_status = 'offline'
                account.save()
                logger.warning(f"Quota sync failed for account #{account.id}: {msg}")
                return Response({"error": msg, "google_error": err_data}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception(f"Exception during quota sync for account #{account.id}")
            account.health_status = 'offline'
            account.save()
            return Response({"error": "An internal error occurred while syncing quota."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='connect-oauth')
    def connect_oauth(self, request):
        code = request.data.get('code')
        redirect_uri = request.data.get('redirect_uri')
        nickname = request.data.get('nickname', 'Google Drive')

        if not code or not redirect_uri:
            return Response({'error': 'code and redirect_uri are required'}, status=status.HTTP_400_BAD_REQUEST)

        logger.info("Exchanging OAuth authorization code with Google token endpoint")

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
            logger.info(f"Token exchange response status: {token_response.status_code}")

            if token_response.status_code != 200:
                logger.warning(f"Token exchange failed: {token_response.status_code}")
                return Response({'error': 'Failed to exchange OAuth code', 'details': token_response.json()}, status=status.HTTP_400_BAD_REQUEST)

            tokens = token_response.json()
            access_token = tokens.get('access_token')
            refresh_token = tokens.get('refresh_token')
            expires_in = tokens.get('expires_in', 3600)
            granted_scopes = tokens.get('scope', '')

            logger.info(f"OAuth token exchange successful. Scopes: {granted_scopes}")

            # Fetch user email associated with this drive account
            profile_url = "https://www.googleapis.com/oauth2/v3/userinfo"
            profile_response = requests.get(
                profile_url,
                headers={"Authorization": f"Bearer {access_token}"}
            )
            logger.info(f"Profile fetch response status: {profile_response.status_code}")

            if profile_response.status_code != 200:
                logger.warning("Failed to fetch Google user profile")
                return Response({'error': 'Failed to fetch user info for connected drive'}, status=status.HTTP_400_BAD_REQUEST)

            profile = profile_response.json()
            email = profile.get('email')
            account_id = profile.get('sub')

            if not email:
                logger.warning("No email found in Google user profile")
                return Response({'error': 'Unable to retrieve email from Google Account'}, status=status.HTTP_400_BAD_REQUEST)

            # Business Rule: One Google account = one Conflux user constraint
            existing = StorageAccount.objects.filter(provider_email=email, provider='google').exclude(user=request.user).first()
            if existing:
                logger.warning(f"Google account {email} is already linked to another Conflux user")
                return Response({
                    'error': f'This Google Drive account ({email}) is already linked to another Conflux user. Please disconnect it from the other account first.',
                }, status=status.HTTP_400_BAD_REQUEST)

            # Fetch drive quota info
            drive_quota_url = "https://www.googleapis.com/drive/v3/about?fields=storageQuota"
            drive_response = requests.get(
                drive_quota_url,
                headers={"Authorization": f"Bearer {access_token}"}
            )
            logger.info(f"Drive quota API response status: {drive_response.status_code}")

            total_storage = 0
            used_storage = 0
            health_status = 'healthy'

            if drive_response.status_code == 200:
                quota = drive_response.json().get('storageQuota', {})
                total_storage = int(quota.get('limit') or 0)
                used_storage = int(quota.get('usage') or 0)
                logger.info(f"Drive quota: total={total_storage}, used={used_storage}")
            else:
                err_body = drive_response.json().get('error', {})
                err_msg = err_body.get('message', drive_response.text)
                logger.error(f"Drive quota fetch failed: {err_msg}")
                health_status = 'offline'
                return Response({
                    'error': f"Google Drive API Error ({drive_response.status_code}): {err_msg}",
                    'details': err_body
                }, status=status.HTTP_400_BAD_REQUEST)

            # Create or update StorageAccount
            defaults = {
                'provider_account_id': account_id,
                'access_token': access_token,
                'token_expiry': timezone.now() + timezone.timedelta(seconds=expires_in),
                'total_storage': total_storage,
                'used_storage': used_storage,
                'health_status': health_status,
                'is_active': True,
            }
            if refresh_token:
                defaults['refresh_token'] = refresh_token

            account, created = StorageAccount.objects.update_or_create(
                user=request.user,
                provider_email=email,
                provider='google',
                defaults=defaults
            )

            if created or nickname != 'Google Drive':
                account.nickname = nickname
                account.save()

            ActivityLog.objects.create(
                user=request.user,
                action='connect',
                details={'drive_nickname': account.nickname, 'drive_email': account.provider_email}
            )

            logger.info(f"Successfully saved StorageAccount #{account.id} for user {request.user.email}")
            return Response(StorageAccountSerializer(account).data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.exception("Exception during OAuth connect")
            return Response({'error': 'An internal error occurred while connecting your Google Drive account.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='google-auth-url')
    def google_auth_url(self, request):
        from urllib.parse import quote
        redirect_uri = request.query_params.get('redirect_uri')
        if not redirect_uri:
            return Response({'error': 'redirect_uri parameter is required'}, status=status.HTTP_400_BAD_REQUEST)

        client_id = settings.GOOGLE_CLIENT_ID
        if not client_id:
            return Response({'error': 'GOOGLE_CLIENT_ID not configured in backend .env'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        scope = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email"
        url = (
            f"https://accounts.google.com/o/oauth2/v2/auth?"
            f"client_id={quote(client_id, safe='')}&"
            f"redirect_uri={quote(redirect_uri, safe='')}&"
            f"response_type=code&"
            f"scope={quote(scope, safe='')}&"
            f"access_type=offline&"
            f"prompt=consent"
        )
        return Response({"url": url})

    @action(detail=True, methods=['get'], url_path='disconnect-preview')
    def disconnect_preview(self, request, pk=None):
        account = self.get_object()
        from apps.files.models import File
        from apps.folders.models import StorageFolder

        file_count = File.objects.filter(storage_account=account, user=request.user).count()
        folder_count = StorageFolder.objects.filter(storage_account=account).count()

        from apps.common.branding import WORKSPACE_FOLDER_NAME
        return Response({
            'account_id': account.id,
            'nickname': account.nickname,
            'provider_email': account.provider_email,
            'file_count': file_count,
            'folder_count': folder_count,
            'used_storage': account.used_storage,
            'workspace_folder_name': WORKSPACE_FOLDER_NAME,
            'workspace_folder_id': account.workspace_folder_id
        })

    @action(detail=True, methods=['post'], url_path='purge-and-disconnect')
    def purge_and_disconnect(self, request, pk=None):
        account = self.get_object()
        from apps.files.models import File
        from apps.folders.models import StorageFolder
        from apps.storage.manager import StorageManager

        # Delete ONLY the Conflux Workspace folder on Google Drive
        if account.workspace_folder_id:
            try:
                manager = StorageManager(user=request.user)
                provider = manager._get_provider_instance(account)
                deleted = provider.delete_file(account.workspace_folder_id)
                if not deleted:
                    return Response({
                        'error': 'Failed to delete Conflux Workspace from Google Drive. Storage account removal aborted.'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            except Exception as e:
                logger.exception(f"Error purging workspace folder for account #{account.id}")
                return Response({
                    'error': 'Failed to delete Conflux Workspace from Google Drive. Storage account removal aborted.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Remove database metadata and account record
        File.objects.filter(storage_account=account).delete()
        StorageFolder.objects.filter(storage_account=account).delete()

        ActivityLog.objects.create(
            user=request.user,
            action='disconnect',
            details={'mode': 'delete_workspace', 'drive_nickname': account.nickname, 'drive_email': account.provider_email}
        )
        account.delete()

        return Response({
            'message': 'Conflux Workspace deleted successfully. Storage account disconnected.'
        }, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        account = self.get_object()
        from apps.files.models import File
        from apps.folders.models import StorageFolder

        mode = request.query_params.get('mode', 'disconnect_only')

        # Clean up database files and folder mappings for this account
        File.objects.filter(storage_account=account).delete()
        StorageFolder.objects.filter(storage_account=account).delete()

        ActivityLog.objects.create(
            user=self.request.user,
            action='disconnect',
            details={'mode': mode, 'drive_nickname': account.nickname, 'drive_email': account.provider_email}
        )
        account.delete()

        return Response({
            'message': 'Storage account disconnected. Files remain safely stored in Google Drive.'
        }, status=status.HTTP_200_OK)



class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ActivityLog.objects.filter(user=self.request.user)[:50]
