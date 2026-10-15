from typing import Any, Optional
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class ConfluxException(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Any] = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class AuthRequiredException(ConfluxException):
    def __init__(self, message: str = "Authentication required", details: Optional[Any] = None):
        super().__init__(
            code="AUTH_REQUIRED",
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details,
        )


class PermissionDeniedException(ConfluxException):
    def __init__(self, message: str = "Permission denied", details: Optional[Any] = None):
        super().__init__(
            code="PERMISSION_DENIED",
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            details=details,
        )


class ResourceNotFoundException(ConfluxException):
    def __init__(self, message: str = "Resource not found", details: Optional[Any] = None):
        super().__init__(
            code="RESOURCE_NOT_FOUND",
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            details=details,
        )


class ConflictException(ConfluxException):
    def __init__(self, message: str = "Resource state conflict", details: Optional[Any] = None):
        super().__init__(
            code="OPERATION_CONFLICT",
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            details=details,
        )


class QuotaInsufficientException(ConfluxException):
    def __init__(self, message: str = "Insufficient quota in destination account", details: Optional[Any] = None):
        super().__init__(
            code="QUOTA_INSUFFICIENT",
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details,
        )


class ProviderReauthRequiredException(ConfluxException):
    def __init__(self, message: str = "Google account re-authorization required", details: Optional[Any] = None):
        super().__init__(
            code="PROVIDER_REAUTH_REQUIRED",
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details,
        )


class UnsupportedCapabilityException(ConfluxException):
    def __init__(self, message: str = "Operation is not supported by provider", details: Optional[Any] = None):
        super().__init__(
            code="UNSUPPORTED_CAPABILITY",
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details,
        )


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ConfluxException)
    async def conflux_exception_handler(request: Request, exc: ConfluxException):
        request_id = getattr(request.state, "request_id", "req-unknown")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "code": exc.code,
                "message": exc.message,
                "request_id": request_id,
                "details": exc.details,
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        request_id = getattr(request.state, "request_id", "req-unknown")
        # Sanitize validation errors
        cleaned_errors = []
        for err in exc.errors():
            loc = [str(item) for item in err.get("loc", [])]
            cleaned_errors.append({
                "field": ".".join(loc),
                "message": err.get("msg", "Invalid value"),
            })
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "code": "VALIDATION_ERROR",
                "message": "Invalid request parameters",
                "request_id": request_id,
                "details": cleaned_errors,
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        request_id = getattr(request.state, "request_id", "req-unknown")
        # Never leak raw stack traces or internal errors to client
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "code": "INTERNAL_ERROR",
                "message": "An unexpected internal server error occurred",
                "request_id": request_id,
                "details": None,
            },
        )
