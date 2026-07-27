from rest_framework.response import Response
from rest_framework import status

# Standardized Error Code Taxonomy
class ErrorCode:
    AUTH_INVALID = "AUTH_INVALID"
    AUTH_EXPIRED = "AUTH_EXPIRED"
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    EMAIL_EXISTS = "EMAIL_EXISTS"
    WEAK_PASSWORD = "WEAK_PASSWORD"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    TOKEN_INVALID = "TOKEN_INVALID"
    TOKEN_ALREADY_USED = "TOKEN_ALREADY_USED"
    SESSION_REVOKED = "SESSION_REVOKED"
    UNVERIFIED_EMAIL = "UNVERIFIED_EMAIL"
    RATE_LIMITED = "RATE_LIMITED"
    
    FILE_NOT_FOUND = "FILE_NOT_FOUND"
    FOLDER_NOT_FOUND = "FOLDER_NOT_FOUND"
    UPLOAD_FAILED = "UPLOAD_FAILED"
    GOOGLE_API_ERROR = "GOOGLE_API_ERROR"
    STORAGE_FULL = "STORAGE_FULL"
    WORKSPACE_NOT_FOUND = "WORKSPACE_NOT_FOUND"
    QUOTA_EXCEEDED = "QUOTA_EXCEEDED"
    PERMISSION_DENIED = "PERMISSION_DENIED"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INTERNAL_ERROR = "INTERNAL_ERROR"

def api_success(data=None, message=None, status_code=status.HTTP_200_OK):
    """
    Returns a standardized API success response payload:
    {
        "success": true,
        "data": ...
    }
    """
    payload = {"success": True}
    if data is not None:
        payload["data"] = data
    if message:
        payload["message"] = message
    return Response(payload, status=status_code)

def api_error(message: str, code: str = ErrorCode.INTERNAL_ERROR, details: dict = None, status_code=status.HTTP_400_BAD_REQUEST):
    """
    Returns a standardized API error response payload:
    {
        "success": false,
        "code": "TOKEN_EXPIRED",
        "message": "Human readable message",
        "details": {}
    }
    """
    return Response({
        "success": False,
        "code": code,
        "message": message,
        "details": details or {}
    }, status=status_code)
