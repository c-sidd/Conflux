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

    def test_chunked_upload_flow(self):
        from unittest.mock import patch
        from django.core.files.uploadedfile import SimpleUploadedFile
        import io

        chunk1 = SimpleUploadedFile("file.bin", b"part1")
        chunk2 = SimpleUploadedFile("file.bin", b"part2")

        # Mock the StorageManager.upload_file response
        with patch('apps.storage.manager.StorageManager.upload_file') as mock_upload:
            mock_upload.return_value = {
                'account_id': self.account.id,
                'provider_file_id': 'gdrive_chunked_123',
                'size': 10,
                'web_view_link': 'https://drive.google.com/chunked_123'
            }

            # Upload Chunk 1
            payload1 = {
                'upload_id': 'test-session-uuid-999',
                'chunk_index': 0,
                'total_chunks': 2,
                'name': 'assembled_test.bin',
                'file': chunk1
            }
            response1 = self.client.post('/api/v1/files/upload-chunk/', payload1, format='multipart')
            self.assertEqual(response1.status_code, 200)
            self.assertTrue(response1.data['success'])

            # Upload Chunk 2 (Final)
            payload2 = {
                'upload_id': 'test-session-uuid-999',
                'chunk_index': 1,
                'total_chunks': 2,
                'name': 'assembled_test.bin',
                'file': chunk2
            }
            response2 = self.client.post('/api/v1/files/upload-chunk/', payload2, format='multipart')
            self.assertEqual(response2.status_code, 201)
            self.assertEqual(response2.data['name'], 'assembled_test.bin')
            self.assertEqual(response2.data['size'], 10)

            # Confirm file object created in DB
            db_file = File.objects.get(name='assembled_test.bin', user=self.user)
            self.assertEqual(db_file.provider_file_id, 'gdrive_chunked_123')

