import os

from django.core.asgi import get_asgi_application

import sitecustomize  # noqa: F401

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "platform.settings")

application = get_asgi_application()
