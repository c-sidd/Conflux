from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient
from apps.authentication.models import PasswordResetToken, EmailVerificationToken, UserSession, SecurityEvent
from apps.authentication.services.token_service import TokenService

User = get_user_model()

class AuthenticationTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.email = "unittest_user@example.com"
        self.password = "ComplexPass123!"
        self.user = User.objects.create_user(
            username=self.email,
            email=self.email,
            password=self.password,
            first_name="Unit",
            last_name="Test"
        )

    def test_register_success(self):
        url = reverse('register')
        payload = {
            "first_name": "New",
            "last_name": "User",
            "email": "newuser@example.com",
            "password": "ValidPassword123!"
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertTrue(User.objects.filter(email="newuser@example.com").exists())

    def test_register_weak_password_rejection(self):
        url = reverse('register')
        payload = {
            "email": "weakuser@example.com",
            "password": "123"
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertEqual(response.data['code'], 'WEAK_PASSWORD')

    def test_register_duplicate_email_rejection(self):
        url = reverse('register')
        payload = {
            "email": self.email,
            "password": "ValidPassword123!"
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['code'], 'EMAIL_EXISTS')

    def test_login_success(self):
        url = reverse('login')
        payload = {
            "email": self.email,
            "password": self.password,
            "remember_me": True
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertTrue(UserSession.objects.filter(user=self.user, is_active=True).exists())

    def test_login_invalid_credentials(self):
        url = reverse('login')
        payload = {
            "email": self.email,
            "password": "WrongPassword123!"
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data['code'], 'INVALID_CREDENTIALS')

    def test_forgot_password_flow(self):
        url = reverse('forgot_password')
        payload = {"email": self.email}
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])

        # Verify hashed token exists in DB
        reset_token = PasswordResetToken.objects.filter(user=self.user, used=False).first()
        self.assertIsNotNone(reset_token)
        self.assertEqual(len(reset_token.token_hash), 64)

    def test_reset_password_execution(self):
        # Create token
        raw_token = TokenService.generate_raw_token()
        token_hash = TokenService.hash_token(raw_token)
        from django.utils import timezone
        from datetime import timedelta
        PasswordResetToken.objects.create(
            user=self.user,
            token_hash=token_hash,
            expires_at=timezone.now() + timedelta(minutes=30),
            used=False
        )

        url = reverse('reset_password')
        payload = {
            "token": raw_token,
            "new_password": "BrandNewPassword123!",
            "confirm_password": "BrandNewPassword123!"
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify user password updated
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("BrandNewPassword123!"))

    def test_change_password_authenticated(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('change_password')
        payload = {
            "current_password": self.password,
            "new_password": "ChangedComplexPass123!",
            "confirm_password": "ChangedComplexPass123!"
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("ChangedComplexPass123!"))

    def test_email_verification_flow(self):
        raw_token = TokenService.generate_raw_token()
        token_hash = TokenService.hash_token(raw_token)
        from django.utils import timezone
        from datetime import timedelta
        EmailVerificationToken.objects.create(
            user=self.user,
            token_hash=token_hash,
            expires_at=timezone.now() + timedelta(hours=24),
            used=False
        )

        url = reverse('verify_email')
        response = self.client.post(url, {"token": raw_token}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertTrue(self.user.is_verified)

    def test_user_sessions_and_security_dashboard(self):
        self.client.force_authenticate(user=self.user)
        
        # Test Sessions GET
        url_sess = reverse('user_sessions')
        resp_sess = self.client.get(url_sess)
        self.assertEqual(resp_sess.status_code, status.HTTP_200_OK)
        self.assertTrue(resp_sess.data['success'])

        # Test Security Dashboard GET
        url_dash = reverse('security_dashboard')
        resp_dash = self.client.get(url_dash)
        self.assertEqual(resp_dash.status_code, status.HTTP_200_OK)
        self.assertIn('dashboard', resp_dash.data)
        self.assertEqual(resp_dash.data['dashboard']['email'], self.email)
