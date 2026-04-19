"""WSGI entrypoint para servidores compatíveis (gunicorn, uwsgi)."""

import os

from django.core.wsgi import get_wsgi_application

import sitecustomize  # noqa: F401

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "platform.settings")

application = get_wsgi_application()
