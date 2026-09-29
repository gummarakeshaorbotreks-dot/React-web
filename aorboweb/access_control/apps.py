from django.apps import AppConfig


class AccessControlConfig(AppConfig):
    name = 'access_control'

    def ready(self):
        from . import signals  # noqa: F401
