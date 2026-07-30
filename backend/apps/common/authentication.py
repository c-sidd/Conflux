from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed

class QueryParamJWTAuthentication(JWTAuthentication):
    """
    Custom JWT Authentication class that supports reading Bearer tokens from:
    1. HTTP 'Authorization: Bearer <token>' header
    2. URL query parameter '?token=<token>' (ideal for direct file downloads and streaming)
    """
    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            raw_token = request.query_params.get('token')
            if raw_token:
                try:
                    validated_token = self.get_validated_token(raw_token)
                    return self.get_user(validated_token), validated_token
                except (InvalidToken, AuthenticationFailed):
                    return None
            return None
        return super().authenticate(request)
