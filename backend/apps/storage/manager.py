from typing import BinaryIO, Dict, Any, Type, List
from .models import StorageAccount, ActivityLog
from .providers.base import StorageProvider
from .providers.google import GoogleDriveProvider
from .strategies import PlacementStrategy, MostFreeSpaceStrategy, RoundRobinStrategy, BestFitStrategy
from django.utils import timezone

class StorageManager:
    """
    Orchestrates file operations across multiple connected cloud storage accounts.
    """

    PROVIDER_MAP: Dict[str, Type[StorageProvider]] = {
        'google': GoogleDriveProvider,
    }

    STRATEGY_MAP: Dict[str, Type[PlacementStrategy]] = {
        'most_free': MostFreeSpaceStrategy,
        'round_robin': RoundRobinStrategy,
        'best_fit': BestFitStrategy,
    }

    def __init__(self, user, strategy_name: str = 'most_free'):
        self.user = user
        self.strategy_class = self.STRATEGY_MAP.get(strategy_name, MostFreeSpaceStrategy)

    def _get_provider_instance(self, account: StorageAccount) -> StorageProvider:
        provider_class = self.PROVIDER_MAP.get(account.provider)
        if not provider_class:
            raise ValueError(f"Provider {account.provider} not supported.")
        
        # Ensure access token is refreshed automatically if expired
        refreshed = account.refresh_access_token()
        if not refreshed and account.health_status == 'expired_token':
            raise Exception(f"OAuth connection for {account.nickname} has expired. Please re-authenticate.")

        return provider_class(
            access_token=account.access_token,
            refresh_token=account.refresh_token
        )

    def get_active_accounts(self) -> List[StorageAccount]:
        """
        Returns only explicitly connected, active and healthy storage accounts.
        """
        return list(StorageAccount.objects.filter(
            user=self.user, 
            is_active=True, 
            health_status='healthy'
        ))

    def select_best_account(self, required_size: int = 0) -> StorageAccount:
        accounts = self.get_active_accounts()
        if not accounts:
            raise Exception("No active storage accounts connected.")
        
        # Apply the selected placement strategy
        strategy = self.strategy_class()
        
        # If strategy is Round Robin, we need the last used account ID to calculate next
        if isinstance(strategy, RoundRobinStrategy):
            # Fetch last uploaded file to find last used account
            from apps.files.models import File
            last_file = File.objects.filter(user=self.user).order_by('-created_at').first()
            if last_file:
                strategy.last_account_id = last_file.storage_account.id
                
        return strategy.select_account(accounts, required_size)

    def simulate_placement(self, filename: str, file_size: int) -> Dict[str, Any]:
        """
        Simulates file placement and returns projected metrics.
        """
        accounts = self.get_active_accounts()
        if not accounts:
            return {
                "success": False,
                "error": "No active storage accounts connected."
            }

        try:
            account = self.select_best_account(required_size=file_size)
            return {
                "success": True,
                "account_id": account.id,
                "nickname": account.nickname,
                "provider": account.provider,
                "provider_email": account.provider_email,
                "current_free": account.free_storage,
                "projected_free": max(0, account.free_storage - file_size),
                "file_size": file_size
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def ensure_workspace_root(self, account: StorageAccount, provider: StorageProvider) -> str:
        if account.workspace_folder_id:
            return account.workspace_folder_id
        
        if hasattr(provider, 'get_or_create_workspace_root'):
            ws_id = provider.get_or_create_workspace_root()
            account.workspace_folder_id = ws_id
            account.save(update_fields=['workspace_folder_id'])
            return ws_id
        return None

    def ensure_folder_on_account(self, account: StorageAccount, provider: StorageProvider, folder_id: int = None) -> str:
        ws_root_id = self.ensure_workspace_root(account, provider)
        if not folder_id:
            return ws_root_id
            
        from apps.folders.models import Folder, StorageFolder
        try:
            target_folder = Folder.objects.get(id=folder_id, user=self.user)
        except Folder.DoesNotExist:
            return ws_root_id

        # Build parent chain from top-level down to target_folder
        chain = []
        curr = target_folder
        while curr:
            chain.append(curr)
            curr = curr.parent
        chain.reverse()

        parent_provider_id = ws_root_id
        for f in chain:
            mapping = StorageFolder.objects.filter(folder=f, storage_account=account).first()
            if mapping:
                parent_provider_id = mapping.provider_folder_id
            else:
                if hasattr(provider, 'get_or_create_folder'):
                    created_id = provider.get_or_create_folder(f.name, parent_id=parent_provider_id)
                    StorageFolder.objects.create(
                        folder=f,
                        storage_account=account,
                        provider_folder_id=created_id
                    )
                    parent_provider_id = created_id
                else:
                    break

        return parent_provider_id

    def upload_file(self, file_obj: BinaryIO, filename: str, mime_type: str, size: int = 0, folder_id: int = None) -> Dict[str, Any]:
        account = self.select_best_account(required_size=size)
        provider = self._get_provider_instance(account)
        
        parent_id = self.ensure_folder_on_account(account, provider, folder_id=folder_id)
        result = provider.upload_file(file_obj, filename, mime_type, parent_id=parent_id)
        
        # Update local quota
        account.used_storage += result.get('size', size)
        account.save()
        
        # Log activity
        ActivityLog.objects.create(
            user=self.user,
            action='upload',
            details={
                'filename': filename,
                'size': result['size'],
                'drive_nickname': account.nickname,
                'drive_email': account.provider_email
            }
        )
        
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

    def delete_file(self, account_id: int, provider_file_id: str, filename: str = "", size: int = 0) -> bool:
        account = StorageAccount.objects.get(id=account_id, user=self.user)
        provider = self._get_provider_instance(account)
        
        success = provider.delete_file(provider_file_id)
        if success:
            account.used_storage = max(0, account.used_storage - size)
            account.save()
            
            # Log activity
            ActivityLog.objects.create(
                user=self.user,
                action='delete',
                details={
                    'filename': filename,
                    'size': size,
                    'drive_nickname': account.nickname,
                    'drive_email': account.provider_email
                }
            )
        return success
    
    def refresh_quotas(self):
        accounts = StorageAccount.objects.filter(user=self.user, is_active=True)
        for account in accounts:
            try:
                provider = self._get_provider_instance(account)
                total, used = provider.get_quota()
                account.total_storage = total
                account.used_storage = used
                account.health_status = 'healthy'
                account.save()
            except Exception as e:
                # Update status
                account.health_status = 'offline'
                account.save()
