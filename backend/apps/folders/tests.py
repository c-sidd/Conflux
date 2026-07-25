from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.folders.models import Folder

User = get_user_model()

class FolderViewSetTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='foldertest', email='foldertest@example.com', password='Password123!')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.root_folder = Folder.objects.create(name='hello', user=self.user)
        self.sub_folder = Folder.objects.create(name='AI', parent=self.root_folder, user=self.user)

    def test_breadcrumb(self):
        response = self.client.get(f'/api/v1/folders/{self.sub_folder.id}/breadcrumb/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]['name'], 'hello')
        self.assertEqual(response.data[1]['name'], 'AI')

    def test_cycle_prevention_on_move(self):
        # Trying to move root_folder inside sub_folder should fail with 400
        response = self.client.post(f'/api/v1/folders/{self.root_folder.id}/move/', {'parent_id': self.sub_folder.id}, format='json')
        self.assertEqual(response.status_code, 400)
