import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from apps.common.response import api_error, ErrorCode

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
    authentication_classes = []
    throttle_scope = 'register'

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            err_msg = "Validation failed for registration input."
            code = ErrorCode.VALIDATION_ERROR
            if 'email' in serializer.errors and any('exists' in str(e) for e in serializer.errors['email']):
                code = ErrorCode.EMAIL_EXISTS
                err_msg = "An account with this email address already exists."
            elif 'password' in serializer.errors:
                code = ErrorCode.WEAK_PASSWORD
                err_msg = serializer.errors['password'][0] if isinstance(serializer.errors['password'], list) else "Password complexity requirements not met."

            return api_error(message=err_msg, code=code, details=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        success, data_or_err, user = AuthService.register_user(
            email=serializer.validated_data['email'],
            password=serializer.validated_data['password'],
            first_name=serializer.validated_data['first_name'],
            last_name=serializer.validated_data['last_name'],
            origin=get_origin(request),
            request=request
        )

        if not success:
            code = ErrorCode.EMAIL_EXISTS if 'email' in data_or_err else ErrorCode.VALIDATION_ERROR
            return api_error(message="Registration failed.", code=code, details=data_or_err, status_code=status.HTTP_400_BAD_REQUEST)

        return Response(data_or_err, status=status.HTTP_201_CREATED)

class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = 'login'

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error(message="Email and password are required.", code=ErrorCode.VALIDATION_ERROR, details=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        success, data_or_err, user = AuthService.login_user(
            email=serializer.validated_data['email'],
            password=serializer.validated_data['password'],
            remember_me=serializer.validated_data['remember_me'],
            request=request
        )

        if not success:
            return api_error(message="Invalid email address or password.", code=ErrorCode.INVALID_CREDENTIALS, status_code=status.HTTP_401_UNAUTHORIZED)

        return Response(data_or_err, status=status.HTTP_200_OK)

class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = 'forgot_password'

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error(message="Please provide a valid email address.", code=ErrorCode.VALIDATION_ERROR, details=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        PasswordResetService.initiate_password_reset(
            email=serializer.validated_data['email'],
            origin=get_origin(request),
            request=request
        )

        return Response({
            'success': True,
            'message': 'If an account with that email address exists, password reset instructions have been sent.'
        }, status=status.HTTP_200_OK)

class VerifyResetTokenView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = 'verify_email'

    def post(self, request):
        serializer = VerifyResetTokenSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error(message="Reset token is required.", code=ErrorCode.VALIDATION_ERROR, details=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        is_valid, err_msg, token_obj = PasswordResetService.verify_reset_token(serializer.validated_data['token'])
        if not is_valid:
            code = ErrorCode.TOKEN_EXPIRED if 'expired' in err_msg.lower() else (ErrorCode.TOKEN_ALREADY_USED if 'used' in err_msg.lower() else ErrorCode.TOKEN_INVALID)
            return api_error(message=err_msg, code=code, status_code=status.HTTP_400_BAD_REQUEST)

        return Response({'success': True, 'message': 'Token is valid.'}, status=status.HTTP_200_OK)

class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = 'reset_password'

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            code = ErrorCode.WEAK_PASSWORD if 'new_password' in serializer.errors else ErrorCode.VALIDATION_ERROR
            return api_error(message="Password reset validation failed.", code=code, details=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        success, msg = PasswordResetService.execute_password_reset(
            raw_token=serializer.validated_data['token'],
            new_password=serializer.validated_data['new_password'],
            request=request
        )

        if not success:
            code = ErrorCode.TOKEN_EXPIRED if 'expired' in msg.lower() else (ErrorCode.TOKEN_ALREADY_USED if 'used' in msg.lower() else ErrorCode.TOKEN_INVALID)
            return api_error(message=msg, code=code, status_code=status.HTTP_400_BAD_REQUEST)

        return Response({'success': True, 'message': msg}, status=status.HTTP_200_OK)

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            code = ErrorCode.WEAK_PASSWORD if 'new_password' in serializer.errors else ErrorCode.VALIDATION_ERROR
            return api_error(message="Password change validation failed.", code=code, details=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        success, msg = AuthService.change_password(
            user=request.user,
            current_password=serializer.validated_data['current_password'],
            new_password=serializer.validated_data['new_password'],
            request=request
        )

        if not success:
            return api_error(message=msg, code=ErrorCode.INVALID_CREDENTIALS, status_code=status.HTTP_400_BAD_REQUEST)

        return Response({'success': True, 'message': msg}, status=status.HTTP_200_OK)

class VerifyEmailView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = 'verify_email'

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error(message="Verification token is required.", code=ErrorCode.VALIDATION_ERROR, details=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        success, msg = VerificationService.verify_email_token(
            raw_token=serializer.validated_data['token'],
            request=request
        )

        if not success:
            code = ErrorCode.TOKEN_EXPIRED if 'expired' in msg.lower() else (ErrorCode.TOKEN_ALREADY_USED if 'used' in msg.lower() else ErrorCode.TOKEN_INVALID)
            return api_error(message=msg, code=code, status_code=status.HTTP_400_BAD_REQUEST)

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
            return api_error(message="Session not found or already revoked.", code=ErrorCode.VALIDATION_ERROR, status_code=status.HTTP_404_NOT_FOUND)
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
            'mfa_enabled': False,
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
            return api_error(message="id_token is required", code=ErrorCode.VALIDATION_ERROR, status_code=status.HTTP_400_BAD_REQUEST)

        try:
            from google.oauth2 import id_token
            from google.auth.transport import requests
            import environ

            env = environ.Env()
            client_id = env('GOOGLE_CLIENT_ID')
            idinfo = id_token.verify_oauth2_token(token, requests.Request(), client_id)

            email = idinfo.get('email')
            first_name = idinfo.get('given_name', '')
            last_name = idinfo.get('family_name', '')

            from django.contrib.auth import get_user_model
            User = get_user_model()
            user, created = User.objects.get_or_create(email=email, defaults={
                'username': email,
                'first_name': first_name,
                'last_name': last_name,
                'is_verified': True
            })

            from rest_framework_simplejwt.tokens import RefreshToken
            refresh = RefreshToken.for_user(user)
            refresh_str = str(refresh)
            refresh.access_token['session_jti'] = str(refresh['jti'])
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
            return api_error(message="Invalid Google OAuth token.", code=ErrorCode.AUTH_INVALID, details={'details': str(e)}, status_code=status.HTTP_400_BAD_REQUEST)
