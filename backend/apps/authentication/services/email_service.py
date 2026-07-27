import logging
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    def send_password_reset_email(user, raw_token: str, origin: str = "http://localhost:3000") -> bool:
        """
        Renders and dispatches password reset email containing the raw token.
        """
        try:
            reset_url = f"{origin.rstrip('/')}/reset-password?token={raw_token}"
            context = {
                'first_name': user.first_name,
                'email': user.email,
                'reset_url': reset_url,
            }
            
            subject = "Reset Your Password - Conflux"
            text_body = render_to_string("emails/password_reset.txt", context)
            html_body = render_to_string("emails/password_reset.html", context)
            
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@conflux.app')
            
            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_body,
                from_email=from_email,
                to=[user.email]
            )
            msg.attach_alternative(html_body, "text/html")
            msg.send(fail_silently=False)
            
            logger.info(f"Password reset email dispatched to {user.email}")
            return True
        except Exception as e:
            logger.exception(f"Failed to send password reset email to {user.email}: {str(e)}")
            return False

    @staticmethod
    def send_verification_email(user, raw_token: str, origin: str = "http://localhost:3000") -> bool:
        """
        Renders and dispatches email verification email containing the raw token.
        """
        try:
            verify_url = f"{origin.rstrip('/')}/verify-email?token={raw_token}"
            context = {
                'first_name': user.first_name,
                'email': user.email,
                'verify_url': verify_url,
            }
            
            subject = "Verify Your Email Address - Conflux"
            text_body = render_to_string("emails/verify_email.txt", context)
            html_body = render_to_string("emails/verify_email.html", context)
            
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@conflux.app')
            
            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_body,
                from_email=from_email,
                to=[user.email]
            )
            msg.attach_alternative(html_body, "text/html")
            msg.send(fail_silently=False)
            
            logger.info(f"Verification email dispatched to {user.email}")
            return True
        except Exception as e:
            logger.exception(f"Failed to send verification email to {user.email}: {str(e)}")
            return False
