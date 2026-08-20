from rest_framework_simplejwt.authentication import JWTAuthentication


class QueryParamJWTAuthentication(JWTAuthentication):
    """
    Backwards-compatible authentication class that accepts JWTs only through
    the standard Authorization header.

    JWTs in query parameters are intentionally unsupported because URLs can be
    stored in browser history, reverse-proxy logs, analytics systems, and
    referrer headers.
    """
    pass
