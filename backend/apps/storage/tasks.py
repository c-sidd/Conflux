from celery import shared_task
from django.contrib.auth import get_user_model

User = get_user_model()

@shared_task
def sync_quotas_for_all_users():
    """
    Periodically syncs storage quotas for all active connected accounts across all users.
    """
    from .manager import StorageManager
    users = User.objects.all()
    for user in users:
        try:
            manager = StorageManager(user)
            manager.refresh_quotas()
        except Exception as e:
            # Handle logging in production
            pass

@shared_task
def sync_quotas_for_user(user_id):
    """
    Syncs storage quotas for a specific user.
    """
    from .manager import StorageManager
    try:
        user = User.objects.get(id=user_id)
        manager = StorageManager(user)
        manager.refresh_quotas()
    except User.DoesNotExist:
        pass
    except Exception as e:
        # Handle logging in production
        pass
