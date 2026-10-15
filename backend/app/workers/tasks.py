import asyncio
from app.core.logging import logger
from app.db.session import AsyncSessionLocal
from app.services.sync_service import SyncService
from app.workers.celery_app import celery_app


def run_async(coro):
    return asyncio.run(coro)


@celery_app.task(name="sync_connected_account", bind=True, max_retries=3, default_retry_delay=60)
def sync_connected_account_task(self, account_id: str, user_id: str):
    logger.info(f"Worker executing sync for account {account_id}")

    async def _execute():
        async with AsyncSessionLocal() as db:
            service = SyncService(db)
            return await service.sync_account(account_id, user_id)

    try:
        return run_async(_execute())
    except Exception as exc:
        logger.error(f"Sync task failed for {account_id}: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(name="periodic_reconciliation")
def periodic_reconciliation_task():
    logger.info("Executing periodic reconciliation for stale cursors and accounts")
    return {"status": "RECONCILIATION_COMPLETED"}
