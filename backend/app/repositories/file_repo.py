from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import delete, desc, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.account import ConnectedAccount
from app.models.file import FileMetadata, RecentActivity, UserFilePreference


class FileRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, file_id: str, user_id: str) -> Optional[Tuple[FileMetadata, Optional[str], bool]]:
        """
        Returns (FileMetadata, source_account_email, is_starred) with strict tenant scoping.
        """
        stmt = (
            select(
                FileMetadata,
                ConnectedAccount.email,
                func.coalesce(UserFilePreference.is_starred, False).label("is_starred")
            )
            .join(ConnectedAccount, FileMetadata.connected_account_id == ConnectedAccount.id)
            .outerjoin(
                UserFilePreference,
                (UserFilePreference.file_metadata_id == FileMetadata.id) &
                (UserFilePreference.user_id == user_id)
            )
            .where(
                FileMetadata.id == file_id,
                FileMetadata.user_id == user_id
            )
        )
        result = await self.db.execute(stmt)
        row = result.first()
        if not row:
            return None
        return row[0], row[1], bool(row[2])

    async def get_by_provider_file_id(
        self,
        account_id: str,
        provider_file_id: str,
        user_id: str
    ) -> Optional[FileMetadata]:
        stmt = (
            select(FileMetadata)
            .where(
                FileMetadata.connected_account_id == account_id,
                FileMetadata.provider_file_id == provider_file_id,
                FileMetadata.user_id == user_id
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_files(
        self,
        user_id: str,
        connected_account_id: Optional[str] = None,
        parent_provider_file_id: Optional[str] = None,
        is_root_only: bool = False,
        trashed: bool = False,
        limit: int = 50,
        offset: int = 0,
        sort_by: str = "modified_desc"
    ) -> Tuple[List[Tuple[FileMetadata, Optional[str], bool]], int]:
        stmt = (
            select(
                FileMetadata,
                ConnectedAccount.email,
                func.coalesce(UserFilePreference.is_starred, False).label("is_starred")
            )
            .join(ConnectedAccount, FileMetadata.connected_account_id == ConnectedAccount.id)
            .outerjoin(
                UserFilePreference,
                (UserFilePreference.file_metadata_id == FileMetadata.id) &
                (UserFilePreference.user_id == user_id)
            )
            .where(
                FileMetadata.user_id == user_id,
                FileMetadata.trashed_provider == trashed,
                ConnectedAccount.connection_status != "DISCONNECTED"
            )
        )

        if connected_account_id:
            stmt = stmt.where(FileMetadata.connected_account_id == connected_account_id)

        if parent_provider_file_id:
            stmt = stmt.where(FileMetadata.parent_provider_file_id == parent_provider_file_id)
        elif is_root_only:
            stmt = stmt.where(
                or_(
                    FileMetadata.parent_provider_file_id.is_(None),
                    FileMetadata.parent_provider_file_id == "root",
                    FileMetadata.parent_provider_file_id == ""
                )
            )

        # Sorting
        if sort_by == "name_asc":
            stmt = stmt.order_by(FileMetadata.is_folder.desc(), FileMetadata.name.asc())
        elif sort_by == "name_desc":
            stmt = stmt.order_by(FileMetadata.is_folder.desc(), FileMetadata.name.desc())
        elif sort_by == "modified_asc":
            stmt = stmt.order_by(FileMetadata.is_folder.desc(), FileMetadata.modified_time_provider.asc())
        else:  # modified_desc
            stmt = stmt.order_by(FileMetadata.is_folder.desc(), FileMetadata.modified_time_provider.desc())

        # Total count
        count_stmt = select(func.count(FileMetadata.id)).where(
            FileMetadata.user_id == user_id,
            FileMetadata.trashed_provider == trashed
        )
        if connected_account_id:
            count_stmt = count_stmt.where(FileMetadata.connected_account_id == connected_account_id)
        if parent_provider_file_id:
            count_stmt = count_stmt.where(FileMetadata.parent_provider_file_id == parent_provider_file_id)

        total_res = await self.db.execute(count_stmt)
        total = total_res.scalar() or 0

        stmt = stmt.limit(limit).offset(offset)
        result = await self.db.execute(stmt)
        items = [(row[0], row[1], bool(row[2])) for row in result.all()]
        return items, total

    async def search_files(
        self,
        user_id: str,
        query: str,
        connected_account_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[Tuple[FileMetadata, Optional[str], bool]], int]:
        pattern = f"%{query.strip()}%"
        stmt = (
            select(
                FileMetadata,
                ConnectedAccount.email,
                func.coalesce(UserFilePreference.is_starred, False).label("is_starred")
            )
            .join(ConnectedAccount, FileMetadata.connected_account_id == ConnectedAccount.id)
            .outerjoin(
                UserFilePreference,
                (UserFilePreference.file_metadata_id == FileMetadata.id) &
                (UserFilePreference.user_id == user_id)
            )
            .where(
                FileMetadata.user_id == user_id,
                FileMetadata.trashed_provider == False,
                ConnectedAccount.connection_status != "DISCONNECTED",
                or_(
                    FileMetadata.name.ilike(pattern),
                    FileMetadata.description.ilike(pattern)
                )
            )
        )
        if connected_account_id:
            stmt = stmt.where(FileMetadata.connected_account_id == connected_account_id)

        stmt = stmt.order_by(FileMetadata.is_folder.desc(), FileMetadata.modified_time_provider.desc())
        stmt = stmt.limit(limit).offset(offset)
        result = await self.db.execute(stmt)
        items = [(row[0], row[1], bool(row[2])) for row in result.all()]
        return items, len(items)

    async def list_starred(
        self,
        user_id: str,
        limit: int = 50
    ) -> List[Tuple[FileMetadata, Optional[str], bool]]:
        stmt = (
            select(
                FileMetadata,
                ConnectedAccount.email,
                UserFilePreference.is_starred
            )
            .join(ConnectedAccount, FileMetadata.connected_account_id == ConnectedAccount.id)
            .join(
                UserFilePreference,
                (UserFilePreference.file_metadata_id == FileMetadata.id) &
                (UserFilePreference.user_id == user_id) &
                (UserFilePreference.is_starred == True)
            )
            .where(
                FileMetadata.user_id == user_id,
                FileMetadata.trashed_provider == False,
                ConnectedAccount.connection_status != "DISCONNECTED"
            )
            .order_by(UserFilePreference.updated_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return [(row[0], row[1], True) for row in result.all()]

    async def list_trash(
        self,
        user_id: str,
        limit: int = 50
    ) -> List[Tuple[FileMetadata, Optional[str]]]:
        stmt = (
            select(FileMetadata, ConnectedAccount.email)
            .join(ConnectedAccount, FileMetadata.connected_account_id == ConnectedAccount.id)
            .where(
                FileMetadata.user_id == user_id,
                FileMetadata.trashed_provider == True,
                ConnectedAccount.connection_status != "DISCONNECTED"
            )
            .order_by(FileMetadata.updated_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return [(row[0], row[1]) for row in result.all()]

    async def upsert_metadata(self, metadata_dict: Dict[str, Any]) -> FileMetadata:
        account_id = metadata_dict["connected_account_id"]
        provider_file_id = metadata_dict["provider_file_id"]
        user_id = metadata_dict["user_id"]

        existing = await self.get_by_provider_file_id(account_id, provider_file_id, user_id)
        if existing:
            for k, v in metadata_dict.items():
                if hasattr(existing, k) and k not in ("id", "created_at"):
                    setattr(existing, k, v)
            existing.updated_at = datetime.now(timezone.utc)
            await self.db.commit()
            await self.db.refresh(existing)
            return existing

        file_meta = FileMetadata(**metadata_dict)
        self.db.add(file_meta)
        await self.db.commit()
        await self.db.refresh(file_meta)
        return file_meta

    async def update_trashed_status(self, file_id: str, user_id: str, trashed: bool) -> bool:
        stmt = (
            update(FileMetadata)
            .where(FileMetadata.id == file_id, FileMetadata.user_id == user_id)
            .values(trashed_provider=trashed, updated_at=datetime.now(timezone.utc))
        )
        result = await self.db.execute(stmt)
        await self.db.commit()
        return result.rowcount > 0

    async def delete_permanently(self, file_id: str, user_id: str) -> bool:
        stmt = (
            delete(FileMetadata)
            .where(FileMetadata.id == file_id, FileMetadata.user_id == user_id)
        )
        result = await self.db.execute(stmt)
        await self.db.commit()
        return result.rowcount > 0

    async def set_starred(self, user_id: str, file_id: str, is_starred: bool) -> None:
        stmt = select(UserFilePreference).where(
            UserFilePreference.user_id == user_id,
            UserFilePreference.file_metadata_id == file_id
        )
        result = await self.db.execute(stmt)
        pref = result.scalar_one_or_none()
        if pref:
            pref.is_starred = is_starred
            pref.updated_at = datetime.now(timezone.utc)
        else:
            pref = UserFilePreference(
                user_id=user_id,
                file_metadata_id=file_id,
                is_starred=is_starred
            )
            self.db.add(pref)
        await self.db.commit()

    async def record_activity(
        self,
        user_id: str,
        action: str,
        file_metadata_id: Optional[str] = None,
        connected_account_id: Optional[str] = None,
        metadata_json: Optional[str] = None
    ) -> None:
        activity = RecentActivity(
            user_id=user_id,
            action=action,
            file_metadata_id=file_metadata_id,
            connected_account_id=connected_account_id,
            metadata_json=metadata_json
        )
        self.db.add(activity)
        await self.db.commit()
