import os

from celery import Celery


# Celery precisa do DJANGO_SETTINGS_MODULE para carregar settings do Django
# quando rodamos `celery -A plataforma ...` no container.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "plataforma.settings.development")

app = Celery("plataforma")

# Lê configurações CELERY_* a partir do Django settings.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Descobre tarefas em apps Django (related_name="tasks") e também em pacotes
# que não são apps (ex.: pacote `tarefas` na raiz).
app.autodiscover_tasks()
app.autodiscover_tasks(["tarefas"])

