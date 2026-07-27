import logging
from django.utils import timezone
from datetime import timedelta
from apps.authentication.models import EmailVerificationToken
from apps.authentication.services.token_service import TokenService
from apps.authentication.services.email_service import EmailService
from apps.authentication.services.audit_service import AuditService

logger = logging.getLogger(__name__)

class VerificationService:
    TOKEN_LIFETIME_HOURS = 24

    @staticmethod
    def send_verification_email(user, origin: str = "http://localhost:3000", request=None) -> bool:
        """
        Generates email verification token and dispatches verification email.
        """
        if user.is_verified:
            return True

        raw_token = TokenService.generate_raw_token()
        token_hash = TokenService.hash_token(raw_token)
        expires_at = timezone.now() + timedelta(hours=VerificationService.TOKEN_LIFETIME_HOURS)

        # Invalidate unused previous verification tokens
        EmailVerificationToken.objects.filter(user=user, used=False).update(used=True)

        EmailVerificationToken.objects.create(
            user=user,
            token_hash=token_hash,
            expires_at=expires_at,
            used=False
        )

        return EmailService.send_verification_email(user=user, raw_token=raw_token, origin=origin)

    @staticmethod
    def verify_email_token(raw_token: str, request=None) -> tuple[bool, str]:
        """
        Verifies account email using raw token string.
        """
        if not raw_token:
            return False, "Verification token is required."

        token_hash = TokenService.hash_token(raw_token)
        try:
            token_obj = EmailVerificationToken.objects.get(token_hash=token_hash)
        except EmailVerificationToken.DoesNotExist:
            return False, "Invalid or expired verification link."

        if token_obj.used:
            return False, "This email verification link has already been used."

        if token_obj.expires_at < timezone.now():
            return False, "This email verification link has expired. Please request a new one."

        user = token_obj.user
        user.is_verified = True
        user.email_verified_at = timezone.now()
        user.save()

        token_obj.used = True
        token_obj.save()

        AuditService.log_event(user=user, event_type='EMAIL_VERIFIED', request=request)
        return True, "Email address verified successfully!"
