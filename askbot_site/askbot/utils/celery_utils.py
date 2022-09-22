"""Utilities for working with Celery tasks"""
from django.db.transaction import on_commit
from django.conf import settings as django_settings

def defer_celery_task(task, **task_kwargs):
    """For eager celery configuration, execute in the current thread,
    for real configs - execute asynchronously"""
    if getattr(django_settings, 'CELERY_TASK_ALWAYS_EAGER', False):
        task.apply(**task_kwargs)
    else:
        on_commit(lambda: task.apply_async(**task_kwargs))
