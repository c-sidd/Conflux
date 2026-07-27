import logging
from django.http import JsonResponse
from rest_framework import status
from rest_framework_simplejwt.tokens import AccessToken
from apps.authentication.models import UserSession

logger = logging.getLogger(__name__)

class SessionActivityMiddleware:
    """
    Middleware that tracks user active session activity, updates last_active timestamp,
    and enforces session revocation across all API requests.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header and auth_header.startswith('Bearer '):
            raw_token = auth_header.split(' ')[1]
            try:
                access_token = AccessToken(raw_token)
                jti = access_token.get('jti')
                if jti:
                    # Check if session exists and is active
                    session = UserSession.objects.filter(refresh_token_jti=jti).first()
                    if session:
                        if not session.is_active:
                            return JsonResponse({
                                'success': False,
                                'code': 'SESSION_REVOKED',
                                'message': 'Your session has been revoked. Please log in again.'
                            }, status=status.HTTP_401_UNAUTHORIZED)
                        
                        # Session is active; update last_active timestamp
                        session.save(update_fields=['last_active'])
            except Exception:
                pass  # DRF authentication backend will handle invalid tokens

        response = self.get_response(request)
        return response
