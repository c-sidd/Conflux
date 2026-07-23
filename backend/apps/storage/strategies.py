from abc import ABC, abstractmethod
from typing import List
from .models import StorageAccount

class PlacementStrategy(ABC):
    @abstractmethod
    def select_account(self, accounts: List[StorageAccount], file_size: int) -> StorageAccount:
        """
        Given a list of active storage accounts and a file size,
        returns the chosen StorageAccount to place the file in.
        """
        pass

class MostFreeSpaceStrategy(PlacementStrategy):
    def select_account(self, accounts: List[StorageAccount], file_size: int) -> StorageAccount:
        # Filter accounts that have enough space
        valid_accounts = [acc for acc in accounts if acc.free_storage >= file_size]
        if not valid_accounts:
            raise Exception("Insufficient storage space across all connected accounts.")
        return max(valid_accounts, key=lambda acc: acc.free_storage)

class RoundRobinStrategy(PlacementStrategy):
    def __init__(self, last_account_id: int = None):
        self.last_account_id = last_account_id

    def select_account(self, accounts: List[StorageAccount], file_size: int) -> StorageAccount:
        valid_accounts = [acc for acc in accounts if acc.free_storage >= file_size]
        if not valid_accounts:
            raise Exception("Insufficient storage space across all connected accounts.")
        
        # Sort accounts by ID to ensure consistent order
        valid_accounts.sort(key=lambda acc: acc.id)
        
        if self.last_account_id is None:
            return valid_accounts[0]
            
        # Find index of last used account
        last_index = -1
        for idx, acc in enumerate(valid_accounts):
            if acc.id == self.last_account_id:
                last_index = idx
                break
        
        # Select next account
        next_index = (last_index + 1) % len(valid_accounts)
        return valid_accounts[next_index]

class BestFitStrategy(PlacementStrategy):
    def select_account(self, accounts: List[StorageAccount], file_size: int) -> StorageAccount:
        valid_accounts = [acc for acc in accounts if acc.free_storage >= file_size]
        if not valid_accounts:
            raise Exception("Insufficient storage space across all connected accounts.")
        # Best fit: minimize (free_storage - file_size) so we don't waste huge drives
        return min(valid_accounts, key=lambda acc: acc.free_storage - file_size)
