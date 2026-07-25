from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from apps.common.response import api_success, api_error

class HealthCheckView(APIView):
    permission_classes = []

    def get(self, request):
        db_ok = True
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        except Exception:
            db_ok = False

        if not db_ok:
            return api_error(message="Database connection failure", code="DATABASE_OFFLINE", status_code=status.HTTP_503_SERVICE_UNAVAILABLE)

        return api_success(data={
            "status": "healthy",
            "database": "connected",
            "environment": "development",
            "api_version": "v1.0.0"
        })

from apps.common.branding import (
    APP_NAME, CURRENT_VERSION, APP_TAGLINE, APP_DESCRIPTION, WORKSPACE_FOLDER_NAME
)

class AboutView(APIView):
    permission_classes = []

    def get(self, request):
        return api_success(data={
            "name": APP_NAME,
            "version": CURRENT_VERSION,
            "tagline": APP_TAGLINE,
            "description": APP_DESCRIPTION,
            "provider": APP_NAME,
            "workspaceFolder": WORKSPACE_FOLDER_NAME,
            "features": [
                "Multiple Google Drive Accounts",
                "Virtual Filesystem",
                "Storage Pooling",
                "Smart Placement Strategy",
                "DCS Workspace Isolation"
            ]
        })

