from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.files.models import File
from apps.folders.models import Folder
from apps.storage.models import StorageAccount

User = get_user_model()

class FileViewSetTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='filetest', email='filetest@example.com', password='Password123!')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.account = StorageAccount.objects.create(
            user=self.user,
            nickname='Test Drive',
            provider_email='filetest@gmail.com',
            encrypted_access_token='dummy_access',
            encrypted_refresh_token='dummy_refresh'
        )

        self.file = File.objects.create(
            name='test_doc.pdf',
            user=self.user,
            storage_account=self.account,
            provider_file_id='dummy_prov_123',
            size=1024,
            mime_type='application/pdf'
        )

    def test_list_files(self):
        response = self.client.get('/api/v1/files/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_toggle_favorite(self):
        response = self.client.post(f'/api/v1/files/{self.file.id}/favorite/')
        self.assertEqual(response.status_code, 200)
        self.file.refresh_from_db()
        self.assertTrue(self.file.is_favorite)

    def test_soft_delete_and_restore(self):
        # Soft delete
        del_resp = self.client.delete(f'/api/v1/files/{self.file.id}/')
        self.assertEqual(del_resp.status_code, 204)
        self.file.refresh_from_db()
        self.assertTrue(self.file.is_trashed)

        # Restore
        res_resp = self.client.post(f'/api/v1/files/{self.file.id}/restore/')
        self.assertEqual(res_resp.status_code, 200)
        self.file.refresh_from_db()
        self.assertFalse(self.file.is_trashed)
