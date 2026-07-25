from django.urls import path
from .views import DeveloperDiagnosticsView

urlpatterns = [
    path('diagnostics/', DeveloperDiagnosticsView.as_view(), name='developer-diagnostics'),
]
