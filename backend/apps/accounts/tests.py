from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()

class AccountAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user_data = {
            'email': 'testuser@example.com',
            'password': 'StrongPassword123!',
            'first_name': 'Test',
            'last_name': 'User'
        }

    def test_user_registration_and_login(self):
        # Register user
        reg_response = self.client.post('/api/v1/auth/register/', self.user_data, format='json')
        self.assertEqual(reg_response.status_code, 201)
        self.assertIn('access', reg_response.data)

        # Login user
        login_data = {'email': 'testuser@example.com', 'password': 'StrongPassword123!'}
        login_response = self.client.post('/api/v1/auth/login/', login_data, format='json')
        self.assertEqual(login_response.status_code, 200)
        self.assertIn('access', login_response.data)
