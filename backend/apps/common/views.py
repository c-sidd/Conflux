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
            "api_version": "v1.5A.5"
        })
