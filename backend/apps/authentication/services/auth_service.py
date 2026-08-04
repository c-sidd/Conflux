import logging
from django.contrib.auth import get_user_model, authenticate
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken
from apps.authentication.services.audit_service import AuditService
from apps.authentication.services.session_service import SessionService
from apps.authentication.services.verification_service import VerificationService

User = get_user_model()
logger = logging.getLogger(__name__)

class AuthService:
    @staticmethod
    def register_user(email: str, password: str, first_name: str = "", last_name: str = "", origin: str = "http://localhost:3000", request=None) -> tuple[bool, dict, User]:
        """
        Creates a new User account, issues JWT tokens, creates UserSession, and triggers email verification.
        """
        email = email.strip().lower()

        if User.objects.filter(email=email).exists():
            return False, {"email": ["A user with this email address already exists."]}, None

        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=first_name.strip(),
            last_name=last_name.strip(),
            is_verified=False
        )

        refresh = RefreshToken.for_user(user)
        refresh_str = str(refresh)
        # Embed refresh JTI into access token so middleware can correlate sessions
        refresh.access_token['session_jti'] = str(refresh['jti'])
        access_str = str(refresh.access_token)

        # Track session
        SessionService.create_session(user=user, refresh_token_str=refresh_str, request=request)

        # Trigger verification email in background thread to prevent SMTP connection blocking
        import threading
        try:
            threading.Thread(
                target=VerificationService.send_verification_email,
                kwargs={'user': user.id, 'origin': origin, 'request': None},
                daemon=True
            ).start()
        except Exception as e:
            logger.error(f"Error triggering background verification email: {str(e)}")

        AuditService.log_event(user=user, event_type='LOGIN', request=request, metadata={'action': 'register'})

        payload = {
            'access': access_str,
            'refresh': refresh_str,
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_verified': user.is_verified,
            }
        }
        return True, payload, user

    @staticmethod
    def login_user(email: str, password: str, remember_me: bool = False, request=None) -> tuple[bool, dict, User]:
        """
        Authenticates user credentials, creates a UserSession, and returns JWT tokens.
        """
        email = email.strip().lower()
        user = authenticate(request, username=email, password=password)
        if not user:
            try:
                u = User.objects.get(email=email)
                if u.check_password(password):
                    user = u
            except User.DoesNotExist:
                user = None

        if not user:
            AuditService.log_event(user=None, event_type='FAILED_LOGIN', request=request, metadata={'attempted_email': email})
            return False, {"non_field_errors": ["Invalid email address or password."]}, None

        refresh = RefreshToken.for_user(user)
        refresh_str = str(refresh)
        # Embed refresh JTI into access token so middleware can correlate sessions
        refresh.access_token['session_jti'] = str(refresh['jti'])
        access_str = str(refresh.access_token)

        # Track active session
        SessionService.create_session(user=user, refresh_token_str=refresh_str, request=request)

        # Log security audit event
        AuditService.log_event(user=user, event_type='LOGIN', request=request)

        payload = {
            'access': access_str,
            'refresh': refresh_str,
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_verified': user.is_verified,
            }
        }
        return True, payload, user

    @staticmethod
    def change_password(user, current_password: str, new_password: str, request=None) -> tuple[bool, str]:
        """
        Validates current password, updates user password, revokes other user sessions, and logs security audit event.
        """
        if not user.check_password(current_password):
            return False, "Your current password is incorrect."

        user.set_password(new_password)
        user.last_password_change = timezone.now()
        user.save()

        # Revoke other sessions
        SessionService.revoke_all_sessions_for_user(user=user, request=request)

        AuditService.log_event(user=user, event_type='PASSWORD_CHANGED', request=request)
        return True, "Password changed successfully."
