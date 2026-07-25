import logging
import traceback
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

def mask_token(token: str) -> str:
    if not token:
        return "NONE"
    if len(token) <= 15:
        return token[:3] + "..."
    return f"{token[:10]}...{token[-5:]}"

class StorageAccountViewSet(viewsets.ModelViewSet):
    serializer_class = StorageAccountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return StorageAccount.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'], url_path='test-connection')
    def test_connection(self, request, pk=None):
        account = self.get_object()
        print(f"\n================ [TEST CONNECTION LOG] ================")
        print(f"Target Storage Account: ID {account.id} | {account.nickname} ({account.provider_email})")
        
        success = account.refresh_access_token()
        token = account.access_token if success else ""
        print(f"Masked Access Token: {mask_token(token)}")
        
        if not success:
            print("Failed to refresh OAuth access token.")
            print("========================================================\n")
            account.health_status = 'expired_token'
            account.save()
            return Response({"status": "failed", "message": "Failed to refresh OAuth tokens."}, status=status.HTTP_400_BAD_REQUEST)

        url = "https://www.googleapis.com/drive/v3/about?fields=storageQuota"
        print(f"Calling Google Drive API URL: {url}")
        
        try:
            res = requests.get(url, headers={"Authorization": f"Bearer {token}"})
            print(f"HTTP Response Status Code: {res.status_code}")
            print(f"Complete JSON Response from Google:\n{res.text}")
            
            if res.status_code == 200:
                account.health_status = 'healthy'
                data = res.json().get('storageQuota', {})
                account.total_storage = int(data.get('limit') or 0)
                account.used_storage = int(data.get('usage') or 0)
                account.save()
                print("Successfully updated StorageAccount model in PostgreSQL.")
                print("========================================================\n")
                return Response({"status": "healthy", "message": "Connection tested successfully.", "quota": data})
            else:
                err_data = res.json().get('error', {})
                msg = err_data.get('message', res.text)
                account.health_status = 'unauthorized' if res.status_code == 401 else 'offline'
                account.save()
                print(f"Google API Error Code: {err_data.get('code', res.status_code)}")
                print(f"Google API Error Message: {msg}")
                print("========================================================\n")
                return Response({"status": "error", "http_status": res.status_code, "google_error": err_data, "message": msg}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print("EXCEPTION OCCURRED DURING TEST CONNECTION:")
            traceback.print_exc()
            print("========================================================\n")
            account.health_status = 'offline'
            account.save()
            return Response({"status": "exception", "error": str(e), "traceback": traceback.format_exc()}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='sync-quota')
    def sync_quota(self, request, pk=None):
        account = self.get_object()
        print(f"\n================ [SYNC QUOTA LOG] ================")
        print(f"Target Account: ID {account.id} | {account.nickname} ({account.provider_email})")
        
        account.refresh_access_token()
        token = account.access_token
        print(f"Masked Access Token: {mask_token(token)}")
        
        url = "https://www.googleapis.com/drive/v3/about?fields=storageQuota"
        print(f"Calling Google Drive API URL: {url}")
        
        try:
            res = requests.get(url, headers={"Authorization": f"Bearer {token}"})
            print(f"HTTP Response Status Code: {res.status_code}")
            print(f"Complete JSON Response from Google:\n{res.text}")
            
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
                print("Successfully updated StorageAccount model in PostgreSQL.")
                print("========================================================\n")
                return Response(StorageAccountSerializer(account).data)
            else:
                err_data = res.json().get('error', {})
                msg = err_data.get('message', res.text)
                account.health_status = 'offline'
                account.save()
                print(f"Google API Error: {msg}")
                print("========================================================\n")
                return Response({"error": msg, "google_error": err_data}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print("EXCEPTION OCCURRED DURING SYNC QUOTA:")
            traceback.print_exc()
            print("========================================================\n")
            account.health_status = 'offline'
            account.save()
            return Response({"error": str(e), "traceback": traceback.format_exc()}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='connect-oauth')
    def connect_oauth(self, request):
        code = request.data.get('code')
        redirect_uri = request.data.get('redirect_uri')
        nickname = request.data.get('nickname', 'Google Drive')

        if not code or not redirect_uri:
            return Response({'error': 'code and redirect_uri are required'}, status=status.HTTP_400_BAD_REQUEST)

        print(f"\n================ [CONNECT OAUTH LOG] ================")
        print(f"Exchanging OAuth Code with Google token endpoint...")
        
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
            print(f"Token Exchange HTTP Status: {token_response.status_code}")
            
            if token_response.status_code != 200:
                print(f"Token Exchange Failed: {token_response.text}")
                print("========================================================\n")
                return Response({'error': 'Failed to exchange OAuth code', 'details': token_response.json()}, status=status.HTTP_400_BAD_REQUEST)
            
            tokens = token_response.json()
            access_token = tokens.get('access_token')
            refresh_token = tokens.get('refresh_token')
            expires_in = tokens.get('expires_in', 3600)
            granted_scopes = tokens.get('scope', '')
            
            print(f"Masked Access Token: {mask_token(access_token)}")
            print(f"Granted Scopes: {granted_scopes}")
            print(f"Has Refresh Token: {bool(refresh_token)}")
            
            # Fetch user email associated with this drive account
            profile_url = "https://www.googleapis.com/oauth2/v3/userinfo"
            print(f"Fetching User Profile: {profile_url}")
            profile_response = requests.get(
                profile_url,
                headers={"Authorization": f"Bearer {access_token}"}
            )
            print(f"Profile Response Status: {profile_response.status_code}")
            
            if profile_response.status_code != 200:
                print(f"Profile Fetch Failed: {profile_response.text}")
                print("========================================================\n")
                return Response({'error': 'Failed to fetch user info for connected drive'}, status=status.HTTP_400_BAD_REQUEST)
                
            profile = profile_response.json()
            email = profile.get('email')
            account_id = profile.get('sub')
            
            if not email:
                print("No email found in user profile.")
                print("========================================================\n")
                return Response({'error': 'Unable to retrieve email from Google Account'}, status=status.HTTP_400_BAD_REQUEST)

            # Business Rule 1: One Google account = one DCS user constraint
            existing = StorageAccount.objects.filter(provider_email=email, provider='google').exclude(user=request.user).first()
            if existing:
                print(f"REJECTED: Google account {email} is already linked to another DCS user account.")
                print("========================================================\n")
                return Response({'error': 'This Google Drive account is already linked to another DCS user account.'}, status=status.HTTP_400_BAD_REQUEST)

            # Fetch drive quota info
            drive_quota_url = "https://www.googleapis.com/drive/v3/about?fields=storageQuota"
            print(f"Fetching Drive Quota API: {drive_quota_url}")
            drive_response = requests.get(
                drive_quota_url,
                headers={"Authorization": f"Bearer {access_token}"}
            )
            print(f"Drive Quota HTTP Status Code: {drive_response.status_code}")
            print(f"Drive Quota Response JSON:\n{drive_response.text}")
            
            total_storage = 0
            used_storage = 0
            health_status = 'healthy'
            
            if drive_response.status_code == 200:
                quota = drive_response.json().get('storageQuota', {})
                total_storage = int(quota.get('limit') or 0)
                used_storage = int(quota.get('usage') or 0)
                print(f"Parsed Quota -> Total: {total_storage} bytes, Used: {used_storage} bytes")
            else:
                err_body = drive_response.json().get('error', {})
                err_msg = err_body.get('message', drive_response.text)
                print(f"CRITICAL: Google Drive API Quota Fetch Failed!")
                print(f"Error Code: {err_body.get('code', drive_response.status_code)}")
                print(f"Error Message: {err_msg}")
                health_status = 'offline'
                print("========================================================\n")
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
            
            print(f"Successfully saved StorageAccount #{account.id} in DB.")
            print("========================================================\n")
            return Response(StorageAccountSerializer(account).data, status=status.HTTP_201_CREATED)

        except Exception as e:
            print("EXCEPTION OCCURRED DURING CONNECT OAUTH:")
            traceback.print_exc()
            print("========================================================\n")
            return Response({'error': str(e), 'traceback': traceback.format_exc()}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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

        # Delete ONLY the DCS Workspace folder on Google Drive
        if account.workspace_folder_id:
            try:
                manager = StorageManager(user=request.user)
                provider = manager._get_provider_instance(account)
                deleted = provider.delete_file(account.workspace_folder_id)
                if not deleted:
                    return Response({
                        'error': 'Failed to delete DCS Workspace from Google Drive. Storage account removal aborted.'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            except Exception as e:
                logger.error(f"Error purging workspace folder: {str(e)}")
                return Response({
                    'error': f'Failed to delete DCS Workspace from Google Drive: {str(e)}. Storage account removal aborted.'
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
            'message': 'DCS Workspace deleted successfully. Storage account disconnected.'
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
