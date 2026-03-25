import os

from celery import Celery

import sitecustomize  # noqa: F401

# Celery precisa do DJANGO_SETTINGS_MODULE para carregar settings do Django
# quando rodamos `celery -A platform ...` no container.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "platform.settings.development")

app = Celery("platform")

# Lê configurações CELERY_* a partir do Django settings.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Descobre tarefas em apps Django (related_name="tasks") e também em pacotes
# que não são apps (ex.: pacote `tasks` na raiz).
app.autodiscover_tasks()
app.autodiscover_tasks(["tasks"])
