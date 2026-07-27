import logging
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
from apps.authentication.models import PasswordResetToken
from apps.authentication.services.token_service import TokenService
from apps.authentication.services.email_service import EmailService
from apps.authentication.services.audit_service import AuditService
from apps.authentication.services.session_service import SessionService

User = get_user_model()
logger = logging.getLogger(__name__)

class PasswordResetService:
    TOKEN_LIFETIME_MINUTES = 30

    @staticmethod
    def initiate_password_reset(email: str, origin: str = "http://localhost:3000", request=None) -> bool:
        """
        Generates a password reset token and sends email.
        Always returns True to prevent email enumeration leakage.
        """
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            logger.info(f"Password reset requested for non-existent email: {email}")
            return True

        raw_token = TokenService.generate_raw_token()
        token_hash = TokenService.hash_token(raw_token)
        expires_at = timezone.now() + timedelta(minutes=PasswordResetService.TOKEN_LIFETIME_MINUTES)

        # Invalidate existing unused reset tokens for this user
        PasswordResetToken.objects.filter(user=user, used=False).update(used=True)

        # Save hashed token
        PasswordResetToken.objects.create(
            user=user,
            token_hash=token_hash,
            expires_at=expires_at,
            used=False
        )

        AuditService.log_event(user=user, event_type='FORGOT_PASSWORD', request=request)

        # Send email with raw token
        EmailService.send_password_reset_email(user=user, raw_token=raw_token, origin=origin)
        return True

    @staticmethod
    def verify_reset_token(raw_token: str) -> tuple[bool, str, PasswordResetToken]:
        """
        Verifies if a raw reset token is valid, unused, and unexpired.
        Returns (is_valid, error_message, token_obj).
        """
        if not raw_token:
            return False, "Token is required.", None

        token_hash = TokenService.hash_token(raw_token)
        try:
            token_obj = PasswordResetToken.objects.get(token_hash=token_hash)
        except PasswordResetToken.DoesNotExist:
            return False, "Invalid or expired password reset link.", None

        if token_obj.used:
            return False, "This password reset link has already been used.", None

        if token_obj.expires_at < timezone.now():
            return False, "This password reset link has expired. Please request a new one.", None

        return True, "", token_obj

    @staticmethod
    def execute_password_reset(raw_token: str, new_password: str, request=None) -> tuple[bool, str]:
        """
        Executes password reset: updates user password, marks token as used, 
        revokes all active sessions, and logs security audit event.
        """
        is_valid, err_msg, token_obj = PasswordResetService.verify_reset_token(raw_token)
        if not is_valid:
            return False, err_msg

        user = token_obj.user
        user.set_password(new_password)
        user.last_password_change = timezone.now()
        user.save()

        # Mark token used
        token_obj.used = True
        token_obj.save()

        # Revoke all active sessions to force re-login
        SessionService.revoke_all_sessions_for_user(user=user, request=request)

        AuditService.log_event(user=user, event_type='PASSWORD_RESET', request=request)
        return True, "Password reset successfully. Please log in with your new password."
