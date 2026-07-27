from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, MeView, LogoutView, GoogleLoginView,
    ForgotPasswordView, VerifyResetTokenView, ResetPasswordView,
    ChangePasswordView, VerifyEmailView, ResendVerificationView,
    UserSessionsView, RevokeAllSessionsView, RevokeSessionByIdView,
    SecurityDashboardView
)

urlpatterns = [
    # Primary Auth
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', MeView.as_view(), name='me'),
    path('google/', GoogleLoginView.as_view(), name='google_login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Password Recovery & Reset
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),
    path('verify-reset-token/', VerifyResetTokenView.as_view(), name='verify_reset_token'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset_password'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),

    # Email Verification
    path('verify-email/', VerifyEmailView.as_view(), name='verify_email'),
    path('resend-verification/', ResendVerificationView.as_view(), name='resend_verification'),

    # Active Devices & Sessions
    path('sessions/', UserSessionsView.as_view(), name='user_sessions'),
    path('sessions/revoke-all/', RevokeAllSessionsView.as_view(), name='revoke_all_sessions'),
    path('sessions/<int:session_id>/revoke/', RevokeSessionByIdView.as_view(), name='revoke_session_by_id'),

    # Security Overview & Audit Logs
    path('security-dashboard/', SecurityDashboardView.as_view(), name='security_dashboard'),
]
