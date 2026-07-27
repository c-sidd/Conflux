import logging
from apps.authentication.models import SecurityEvent

logger = logging.getLogger(__name__)

class AuditService:
    @staticmethod
    def log_event(user, event_type: str, request=None, metadata: dict = None):
        """
        Creates a persistent SecurityEvent log record.
        """
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

        try:
            event = SecurityEvent.objects.create(
                user=user,
                event_type=event_type,
                ip_address=ip_address,
                device_name=device_name,
                user_agent=user_agent[:500] if user_agent else '',
                metadata=metadata or {}
            )
            logger.info(f"[SECURITY EVENT] {event_type} for {user.email if user else 'anonymous'} from {ip_address}")
            return event
        except Exception as e:
            logger.exception(f"Failed to create SecurityEvent log: {str(e)}")
            return None

    @staticmethod
    def _parse_device_name(user_agent: str) -> str:
        if not user_agent:
            return "Unknown Device"

        ua_lower = user_agent.lower()
        
        # Browser detection
        browser = "Browser"
        if "chrome" in ua_lower and "edg" not in ua_lower:
            browser = "Chrome"
        elif "safari" in ua_lower and "chrome" not in ua_lower:
            browser = "Safari"
        elif "firefox" in ua_lower:
            browser = "Firefox"
        elif "edg" in ua_lower:
            browser = "Edge"

        # OS detection
        os = "Desktop"
        if "windows" in ua_lower:
            os = "Windows"
        elif "macintosh" in ua_lower or "mac os" in ua_lower:
            os = "macOS"
        elif "linux" in ua_lower:
            os = "Linux"
        elif "android" in ua_lower:
            os = "Android"
        elif "iphone" in ua_lower or "ipad" in ua_lower:
            os = "iOS"

        return f"{browser} on {os}"
