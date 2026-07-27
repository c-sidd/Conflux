import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from apps.authentication.serializers import (
    RegisterSerializer, LoginSerializer, ForgotPasswordSerializer,
    VerifyResetTokenSerializer, ResetPasswordSerializer,
    ChangePasswordSerializer, VerifyEmailSerializer,
    UserSessionSerializer, SecurityEventSerializer
)
from apps.authentication.services.auth_service import AuthService
from apps.authentication.services.password_reset_service import PasswordResetService
from apps.authentication.services.verification_service import VerificationService
from apps.authentication.services.session_service import SessionService
from apps.authentication.services.audit_service import AuditService
from apps.authentication.models import UserSession, SecurityEvent

logger = logging.getLogger(__name__)

def get_origin(request) -> str:
    origin = request.META.get('HTTP_ORIGIN')
    if not origin:
        origin = request.META.get('HTTP_REFERER')
    if not origin:
        origin = "http://localhost:3000"
    return origin.rstrip('/')

class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'register'

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        success, data_or_err, user = AuthService.register_user(
            email=serializer.validated_data['email'],
            password=serializer.validated_data['password'],
            first_name=serializer.validated_data['first_name'],
            last_name=serializer.validated_data['last_name'],
            origin=get_origin(request),
            request=request
        )

        if not success:
            return Response({'success': False, 'errors': data_or_err}, status=status.HTTP_400_BAD_REQUEST)

        return Response(data_or_err, status=status.HTTP_201_CREATED)

class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'login'

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        success, data_or_err, user = AuthService.login_user(
            email=serializer.validated_data['email'],
            password=serializer.validated_data['password'],
            remember_me=serializer.validated_data['remember_me'],
            request=request
        )

        if not success:
            return Response({'success': False, 'errors': data_or_err}, status=status.HTTP_401_UNAUTHORIZED)

        return Response(data_or_err, status=status.HTTP_200_OK)

class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'forgot_password'

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        PasswordResetService.initiate_password_reset(
            email=serializer.validated_data['email'],
            origin=get_origin(request),
            request=request
        )

        # Uniform non-enumerated success message
        return Response({
            'success': True,
            'message': 'If an account with that email address exists, password reset instructions have been sent.'
        }, status=status.HTTP_200_OK)

class VerifyResetTokenView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'verify_email'

    def post(self, request):
        serializer = VerifyResetTokenSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        is_valid, err_msg, token_obj = PasswordResetService.verify_reset_token(serializer.validated_data['token'])
        if not is_valid:
            return Response({'success': False, 'message': err_msg}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'success': True, 'message': 'Token is valid.'}, status=status.HTTP_200_OK)

class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'reset_password'

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        success, msg = PasswordResetService.execute_password_reset(
            raw_token=serializer.validated_data['token'],
            new_password=serializer.validated_data['new_password'],
            request=request
        )

        if not success:
            return Response({'success': False, 'message': msg}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'success': True, 'message': msg}, status=status.HTTP_200_OK)

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        success, msg = AuthService.change_password(
            user=request.user,
            current_password=serializer.validated_data['current_password'],
            new_password=serializer.validated_data['new_password'],
            request=request
        )

        if not success:
            return Response({'success': False, 'message': msg}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'success': True, 'message': msg}, status=status.HTTP_200_OK)

class VerifyEmailView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'verify_email'

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        success, msg = VerificationService.verify_email_token(
            raw_token=serializer.validated_data['token'],
            request=request
        )

        if not success:
            return Response({'success': False, 'message': msg}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'success': True, 'message': msg}, status=status.HTTP_200_OK)

class ResendVerificationView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = 'resend_verification'

    def post(self, request):
        if request.user.is_verified:
            return Response({'success': True, 'message': 'Account email is already verified.'}, status=status.HTTP_200_OK)

        VerificationService.send_verification_email(
            user=request.user,
            origin=get_origin(request),
            request=request
        )

        return Response({'success': True, 'message': 'Verification email resent.'}, status=status.HTTP_200_OK)

class UserSessionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = UserSession.objects.filter(user=request.user, is_active=True)
        serializer = UserSessionSerializer(sessions, many=True, context={'request': request})
        return Response({'success': True, 'sessions': serializer.data}, status=status.HTTP_200_OK)

class RevokeAllSessionsView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = 'revoke_sessions'

    def post(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        current_jti = None
        if auth_header and auth_header.startswith('Bearer '):
            try:
                from rest_framework_simplejwt.tokens import AccessToken
                token = AccessToken(auth_header.split(' ')[1])
                current_jti = token.get('jti')
            except Exception:
                pass

        count = SessionService.revoke_all_sessions_for_user(user=request.user, current_jti=current_jti, request=request)
        return Response({
            'success': True,
            'message': f'Revoked {count} active sessions on other devices.',
            'revoked_count': count
        }, status=status.HTTP_200_OK)

class RevokeSessionByIdView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        success = SessionService.revoke_session_by_id(user=request.user, session_id=session_id, request=request)
        if not success:
            return Response({'success': False, 'message': 'Session not found or already revoked.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'success': True, 'message': 'Session revoked.'}, status=status.HTTP_200_OK)

class SecurityDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        active_sessions_count = UserSession.objects.filter(user=user, is_active=True).count()
        recent_events = SecurityEvent.objects.filter(user=user)[:15]
        
        last_login_event = SecurityEvent.objects.filter(user=user, event_type='LOGIN').first()

        data = {
            'email': user.email,
            'is_verified': user.is_verified,
            'email_verified_at': user.email_verified_at,
            'last_password_change': user.last_password_change,
            'mfa_enabled': False,  # Reserved Phase 4 extension placeholder
            'active_devices_count': active_sessions_count,
            'last_login_at': last_login_event.timestamp if last_login_event else None,
            'recent_events': SecurityEventSerializer(recent_events, many=True).data
        }
        return Response({'success': True, 'dashboard': data}, status=status.HTTP_200_OK)

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'id': user.id,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_verified': user.is_verified,
        }, status=status.HTTP_200_OK)

class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                from rest_framework_simplejwt.tokens import RefreshToken
                token = RefreshToken(refresh_token)
                jti = token.get('jti')
                UserSession.objects.filter(refresh_token_jti=jti).update(is_active=False)
                token.blacklist()
                if request.user.is_authenticated:
                    AuditService.log_event(user=request.user, event_type='LOGOUT', request=request)
        except Exception:
            pass
        return Response({'success': True, 'message': 'Logged out successfully'}, status=status.HTTP_200_OK)

class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get('id_token')
        if not token:
            return Response({'error': 'id_token is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from google.oauth2 import id_token
            from google.auth.transport import requests
            from django.conf import settings
            import environ

            env = environ.Env()
            client_id = env('GOOGLE_CLIENT_ID')
            idinfo = id_token.verify_oauth2_token(token, requests.Request(), client_id)

            email = idinfo.get('email')
            first_name = idinfo.get('given_name', '')
            last_name = idinfo.get('family_name', '')

            user, created = User.objects.get_or_create(email=email, defaults={
                'username': email,
                'first_name': first_name,
                'last_name': last_name,
                'is_verified': True
            })

            refresh = RefreshToken.for_user(user)
            refresh_str = str(refresh)
            access_str = str(refresh.access_token)

            SessionService.create_session(user=user, refresh_token_str=refresh_str, request=request)
            AuditService.log_event(user=user, event_type='LOGIN', request=request, metadata={'provider': 'google'})

            return Response({
                'access': access_str,
                'refresh': refresh_str,
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'is_verified': user.is_verified,
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'error': 'Invalid token', 'details': str(e)}, status=status.HTTP_400_BAD_REQUEST)
