"""
URL configuration for dcs project with API v1 versioning.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API v1 routes (Primary Versioned APIs)
    path('api/v1/auth/', include('apps.authentication.urls')),
    path('api/v1/', include('apps.folders.urls')),
    path('api/v1/', include('apps.files.urls')),
    path('api/v1/', include('apps.trash.urls')),
    path('api/v1/', include('apps.search.urls')),
    path('api/v1/', include('apps.recent.urls')),
    path('api/v1/', include('apps.diagnostics.urls')),
    path('api/v1/storage/', include('apps.storage.urls')),
    path('api/v1/dashboard/', include('apps.dashboard.urls')),

    # Legacy unversioned /api/ fallback endpoints for backwards compatibility
    path('api/auth/', include('apps.authentication.urls')),
    path('api/', include('apps.folders.urls')),
    path('api/', include('apps.files.urls')),
    path('api/', include('apps.trash.urls')),
    path('api/', include('apps.search.urls')),
    path('api/', include('apps.recent.urls')),
    path('api/', include('apps.diagnostics.urls')),
    path('api/storage/', include('apps.storage.urls')),
    path('api/dashboard/', include('apps.dashboard.urls')),
]
