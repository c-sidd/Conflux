from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.authentication.models import UserSession, SecurityEvent
from apps.authentication.validators import validate_complex_password

User = get_user_model()

class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    first_name = serializers.CharField(required=False, allow_blank=True, default="")
    last_name = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_password(self, value):
        validate_complex_password(value)
        return value

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    remember_me = serializers.BooleanField(required=False, default=False)

class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

class VerifyResetTokenSerializer(serializers.Serializer):
    token = serializers.CharField()

class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        if data.get('new_password') != data.get('confirm_password'):
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        validate_complex_password(data.get('new_password'))
        return data

class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        if data.get('new_password') != data.get('confirm_password'):
            raise serializers.ValidationError({"confirm_password": "New passwords do not match."})
        validate_complex_password(data.get('new_password'))
        return data

class VerifyEmailSerializer(serializers.Serializer):
    token = serializers.CharField()

class UserSessionSerializer(serializers.ModelSerializer):
    is_current = serializers.SerializerMethodField()

    class Meta:
        model = UserSession
        fields = ['id', 'device_name', 'ip_address', 'user_agent', 'last_active', 'created_at', 'is_active', 'is_current']

    def get_is_current(self, obj):
        request = self.context.get('request')
        if not request or not request.META.get('HTTP_AUTHORIZATION'):
            return False
        try:
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            token_str = auth_header.split(' ')[1]
            from rest_framework_simplejwt.tokens import AccessToken
            access_token = AccessToken(token_str)
            return obj.refresh_token_jti == access_token.get('jti')
        except Exception:
            return False

class SecurityEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = SecurityEvent
        fields = ['id', 'event_type', 'ip_address', 'device_name', 'timestamp', 'metadata']
