from django.db import models
from django.conf import settings

class UserSession(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sessions')
    refresh_token_jti = models.CharField(max_length=255, unique=True, db_index=True)
    device_name = models.CharField(max_length=255, default='Unknown Device')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default='')
    last_active = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-last_active']

    def __str__(self):
        return f"{self.user.email} - {self.device_name} ({'Active' if self.is_active else 'Revoked'})"

class SecurityEvent(models.Model):
    EVENT_TYPES = (
        ('LOGIN', 'User Login'),
        ('LOGOUT', 'User Logout'),
        ('PASSWORD_RESET', 'Password Reset Requested/Executed'),
        ('PASSWORD_CHANGED', 'Password Changed'),
        ('EMAIL_VERIFIED', 'Email Address Verified'),
        ('SESSION_REVOKED', 'Session Revoked'),
        ('FAILED_LOGIN', 'Failed Login Attempt'),
        ('FORGOT_PASSWORD', 'Forgot Password Initiated'),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name='security_events')
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    device_name = models.CharField(max_length=255, blank=True, default='')
    user_agent = models.TextField(blank=True, default='')
    timestamp = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        email = self.user.email if self.user else 'Unknown'
        return f"[{self.event_type}] {email} at {self.timestamp}"

class PasswordResetToken(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reset_tokens')
    token_hash = models.CharField(max_length=64, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"ResetToken for {self.user.email} (Used: {self.used})"

class EmailVerificationToken(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='verification_tokens')
    token_hash = models.CharField(max_length=64, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"VerificationToken for {self.user.email} (Used: {self.used})"
