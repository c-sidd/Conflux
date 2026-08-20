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
                'upload_id': 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
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
                'upload_id': 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
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

    def test_upload_rollback_on_db_error(self):
        from unittest.mock import patch
        from django.core.files.uploadedfile import SimpleUploadedFile

        test_file = SimpleUploadedFile("test_report.pdf", b"pdf content", content_type="application/pdf")
        payload = {
            'file': test_file
        }

        # Mock the StorageManager methods and File.objects.create
        with patch('apps.storage.manager.StorageManager.upload_file') as mock_upload, \
             patch('apps.storage.manager.StorageManager.delete_file') as mock_delete, \
             patch('apps.files.views.File.objects.create', side_effect=Exception("Database error")):
            
            mock_upload.return_value = {
                "account_id": self.account.id,
                "provider_file_id": "provider-test-id",
                "size": 1234,
                "web_view_link": "https://example.com/file"
            }

            response = self.client.post('/api/v1/files/', payload, format='multipart')

            self.assertEqual(response.status_code, 500)
            mock_upload.assert_called_once()
            mock_delete.assert_called_once_with(
                account_id=self.account.id,
                provider_file_id="provider-test-id",
                filename="test_report.pdf",
                size=1234
            )
            # Assert no File record is in DB with provider-test-id
            self.assertFalse(File.objects.filter(provider_file_id="provider-test-id").exists())

    def test_upload_rollback_failure_logged(self):
        from unittest.mock import patch
        from django.core.files.uploadedfile import SimpleUploadedFile

        test_file = SimpleUploadedFile("test_report.pdf", b"pdf content", content_type="application/pdf")
        payload = {
            'file': test_file
        }

        # Mock storage manager methods, having delete_file raise an exception
        with patch('apps.storage.manager.StorageManager.upload_file') as mock_upload, \
             patch('apps.storage.manager.StorageManager.delete_file', side_effect=Exception("Delete failed")) as mock_delete, \
             patch('apps.files.views.File.objects.create', side_effect=Exception("Database error")), \
             self.assertLogs('apps.files.views', level='CRITICAL') as log_capture:
            
            mock_upload.return_value = {
                "account_id": self.account.id,
                "provider_file_id": "provider-test-id",
                "size": 1234,
                "web_view_link": "https://example.com/file"
            }

            response = self.client.post('/api/v1/files/', payload, format='multipart')

            self.assertEqual(response.status_code, 500)
            self.assertIn("An error occurred while saving the file metadata", response.data['error'])
            
            # Assert critical log entry exists and contains details
            critical_logs = [log for log in log_capture.output if "Orphaned file left in storage provider" in log]
            self.assertTrue(len(critical_logs) > 0)
            self.assertIn("provider-test-id", critical_logs[0])
            self.assertIn("test_report.pdf", critical_logs[0])

    def test_rename_rollback_on_provider_error(self):
        from unittest.mock import patch
        with patch('apps.storage.manager.StorageManager.rename_file', return_value=False) as mock_rename:
            old_name = self.file.name
            response = self.client.patch(f'/api/v1/files/{self.file.id}/', {'name': 'new_test_name.pdf'})
            self.assertEqual(response.status_code, 500)
            self.file.refresh_from_db()
            self.assertEqual(self.file.name, old_name)
            mock_rename.assert_called_once()

    def test_move_rollback_on_provider_error(self):
        from unittest.mock import patch
        with patch('apps.storage.manager.StorageManager.move_file', return_value=False) as mock_move:
            response = self.client.post(f'/api/v1/files/{self.file.id}/move/', {'folder_id': 9999})
            self.assertEqual(response.status_code, 500)
            self.file.refresh_from_db()
            self.assertNotEqual(self.file.folder_id, 9999)
            mock_move.assert_called_once()

    def test_bulk_move_success_and_failures(self):
        from unittest.mock import patch
        from apps.folders.models import Folder
        
        target_folder = Folder.objects.create(name='Target Folder', user=self.user)
        
        file2 = File.objects.create(
            name='second_file.txt',
            user=self.user,
            storage_account=self.account,
            provider_file_id='dummy_prov_456',
            size=512,
            mime_type='text/plain'
        )

        # Mock move_file so first succeeds, second fails
        with patch('apps.storage.manager.StorageManager.move_file', side_effect=[True, False]) as mock_move:
            payload = {
                'file_ids': [self.file.id, file2.id],
                'folder_id': target_folder.id
            }
            response = self.client.post('/api/v1/files/bulk-move/', payload, format='json')
            self.assertEqual(response.status_code, 200)
            self.assertEqual(len(response.data['successful']), 1)
            self.assertEqual(len(response.data['failed']), 1)
            
            # First file should be moved in DB
            self.file.refresh_from_db()
            self.assertEqual(self.file.folder_id, target_folder.id)
            
            # Second file should NOT be moved in DB
            file2.refresh_from_db()
            self.assertNotEqual(file2.folder_id, target_folder.id)

    def test_permanent_delete_rollback_on_provider_error(self):
        from unittest.mock import patch
        with patch('apps.storage.manager.StorageManager.delete_file', return_value=False) as mock_delete:
            response = self.client.delete(f'/api/v1/files/{self.file.id}/permanent-delete/')
            self.assertEqual(response.status_code, 500)
            # Verify file metadata still exists in DB
            self.assertTrue(File.objects.filter(id=self.file.id).exists())
            mock_delete.assert_called_once()

