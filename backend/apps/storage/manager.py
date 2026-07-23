from typing import BinaryIO, Dict, Any, Type
from .models import StorageAccount
from .providers.base import StorageProvider
from .providers.google import GoogleDriveProvider

class StorageManager:
    """
    Orchestrates file operations across multiple connected cloud storage accounts.
    """

    PROVIDER_MAP: Dict[str, Type[StorageProvider]] = {
        'google_drive': GoogleDriveProvider,
        # 'dropbox': DropboxProvider, etc.
    }

    def __init__(self, user):
        self.user = user

    def _get_provider_instance(self, account: StorageAccount) -> StorageProvider:
        provider_class = self.PROVIDER_MAP.get(account.provider)
        if not provider_class:
            raise ValueError(f"Provider {account.provider} not supported.")
        
        # Instantiate provider with tokens
        # For a real implementation, we should check token_expiry and refresh if needed.
        return provider_class(
            access_token=account.access_token,
            refresh_token=account.refresh_token
        )

    def select_best_account(self, required_size: int = 0) -> StorageAccount:
        """
        Selects the storage account with the most free space.
        """
        accounts = StorageAccount.objects.filter(user=self.user, is_active=True)
        if not accounts.exists():
            raise Exception("No active storage accounts connected.")
        
        # In a very large scale app, this would be a DB query.
        # Since number of accounts per user is small (~1-10), python sorting is fine.
        best_account = max(accounts, key=lambda acc: acc.free_storage)
        
        if best_account.free_storage < required_size:
            raise Exception("Insufficient storage across all connected accounts.")
            
        return best_account

    def upload_file(self, file_obj: BinaryIO, filename: str, mime_type: str, size: int = 0) -> Dict[str, Any]:
        """
        Uploads a file to the best available storage account.
        """
        account = self.select_best_account(required_size=size)
        provider = self._get_provider_instance(account)
        
        result = provider.upload_file(file_obj, filename, mime_type)
        
        # Update quota locally
        account.used_storage += result.get('size', size)
        account.save()
        
        return {
            'account_id': account.id,
            'provider': account.provider,
            'provider_file_id': result['provider_file_id'],
            'size': result['size'],
            'web_view_link': result['web_view_link']
        }

    def download_file(self, account_id: int, provider_file_id: str) -> BinaryIO:
        account = StorageAccount.objects.get(id=account_id, user=self.user)
        provider = self._get_provider_instance(account)
        return provider.download_file(provider_file_id)

    def delete_file(self, account_id: int, provider_file_id: str, size: int = 0) -> bool:
        account = StorageAccount.objects.get(id=account_id, user=self.user)
        provider = self._get_provider_instance(account)
        
        success = provider.delete_file(provider_file_id)
        if success:
            account.used_storage = max(0, account.used_storage - size)
            account.save()
        return success
    
    def refresh_quotas(self):
        """
        Refresh quotas for all connected accounts. Can be run in a Celery task.
        """
        accounts = StorageAccount.objects.filter(user=self.user, is_active=True)
        for account in accounts:
            try:
                provider = self._get_provider_instance(account)
                total, used = provider.get_quota()
                account.total_storage = total
                account.used_storage = used
                account.save()
            except Exception as e:
                # Log error
                pass
