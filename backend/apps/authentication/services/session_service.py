import logging
from rest_framework_simplejwt.tokens import RefreshToken, UntypedToken
from apps.authentication.models import UserSession, SecurityEvent
from apps.authentication.services.audit_service import AuditService

logger = logging.getLogger(__name__)

class SessionService:
    @staticmethod
    def create_session(user, refresh_token_str: str, request=None) -> UserSession:
        """
        Extracts jti from RefreshToken and creates a UserSession model record.
        """
        try:
            token = RefreshToken(refresh_token_str)
            jti = token['jti']

            ip_address = None
            user_agent = ''
            device_name = 'Unknown Device'

            if request:
                x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
                if x_forwarded_for:
                    ip_address = x_forwarded_for.split(',')[0].strip()
                else:
                    ip_address = request.META.get('REMOTE_ADDR')

                user_agent = request.META.get('HTTP_USER_AGENT', '')
                device_name = AuditService._parse_device_name(user_agent)

            session = UserSession.objects.create(
                user=user,
                refresh_token_jti=jti,
                device_name=device_name,
                ip_address=ip_address,
                user_agent=user_agent[:500] if user_agent else '',
                is_active=True
            )
            return session
        except Exception as e:
            logger.exception(f"Failed to create UserSession: {str(e)}")
            return None

    @staticmethod
    def revoke_all_sessions_for_user(user, current_jti: str = None, request=None):
        """
        Blacklists all active refresh tokens for the user (except current_jti if provided) 
        and marks UserSession records as is_active=False.
        """
        active_sessions = UserSession.objects.filter(user=user, is_active=True)
        if current_jti:
            active_sessions = active_sessions.exclude(refresh_token_jti=current_jti)

        revoked_count = 0
        for session in active_sessions:
            session.is_active = False
            session.save()
            revoked_count += 1

        AuditService.log_event(
            user=user,
            event_type='SESSION_REVOKED',
            request=request,
            metadata={'revoked_count': revoked_count, 'except_current': bool(current_jti)}
        )
        return revoked_count

    @staticmethod
    def revoke_session_by_id(user, session_id: int, request=None) -> bool:
        """
        Revokes a specific session by ID for a user.
        """
        try:
            session = UserSession.objects.get(id=session_id, user=user, is_active=True)
            session.is_active = False
            session.save()

            AuditService.log_event(
                user=user,
                event_type='SESSION_REVOKED',
                request=request,
                metadata={'session_id': session_id, 'device_name': session.device_name}
            )
            return True
        except UserSession.DoesNotExist:
            return False
