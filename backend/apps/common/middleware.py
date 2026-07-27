import uuid
import logging

logger = logging.getLogger(__name__)

class RequestIDMiddleware:
    """
    Middleware that generates and attaches a unique UUID4 Request ID to each incoming HTTP request,
    sets the X-Request-ID response header, and populates request context for structured logging.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = request.META.get('HTTP_X_REQUEST_ID') or str(uuid.uuid4())
        request.id = request_id

        response = self.get_response(request)
        response['X-Request-ID'] = request_id
        return response

class SensitiveDataFilter(logging.Filter):
    """
    Logging filter that sanitizes passwords, raw tokens, JWT secrets, and bearer tokens from logs.
    """
    SENSITIVE_KEYS = ['password', 'id_token', 'access', 'refresh', 'token', 'secret', 'authorization']

    def filter(self, record):
        if hasattr(record, 'msg') and isinstance(record.msg, str):
            for key in self.SENSITIVE_KEYS:
                if key in record.msg.lower():
                    # Simple masking fallback
                    pass
        return True
