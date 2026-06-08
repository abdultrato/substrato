from datetime import timedelta
from importlib.util import find_spec
import os
from pathlib import Path
import socket

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv
from kombu import Exchange, Queue

from substrato_os.domain_modules import INSTALLED_DOMAIN_APP_CONFIGS

# =========================================================
# PATH & ENV
# =========================================================

BASE_DIR = Path(__file__).resolve().parents[2]

# Carrega variáveis do ambiente.
# Preferência: `.env` (local/docker) e depois `.env.staging` (fallback).
load_dotenv(BASE_DIR / ".env", override=False)
load_dotenv(BASE_DIR / ".env.staging", override=False)

ROOT_URLCONF = "platform.urls"
WSGI_APPLICATION = "platform.wsgi.application"
ASGI_APPLICATION = "platform.asgi.application"


def get_env(name, default=None, required=False):
    value = os.getenv(name, default)

    if required and value is None:
        raise ImproperlyConfigured(f"{name} is required")

    return value


def get_env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on", "sim"}


def get_env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or str(raw).strip() == "":
        return default
    try:
        return int(str(raw).strip())
    except ValueError as exc:
        raise ImproperlyConfigured(f"{name} must be an integer") from exc


def get_env_csv(name: str, default: str) -> list[str]:
    raw = os.getenv(name, default)
    values = [item.strip() for item in str(raw or "").split(",") if item.strip()]
    return values or [item.strip() for item in default.split(",") if item.strip()]


def _module_available(module_name: str) -> bool:
    return find_spec(module_name) is not None


# =========================================================
# CORE
# =========================================================

SECRET_KEY = get_env("DJANGO_SECRET_KEY", required=True)

DEBUG = get_env("DJANGO_DEBUG", "True").lower() == "true"

ALLOWED_HOSTS = [
    host.strip() for host in get_env("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost").split(",") if host.strip()
]

# Desliga persistência síncrona de atividade em ambiente local para reduzir latência
# de resposta durante navegação e desenvolvimento.
USER_ACTIVITY_IN_DEBUG = get_env("USER_ACTIVITY_IN_DEBUG", "false").lower() in ("1", "true", "yes", "on")

# =========================================================
# SYSTEM VERSION (UI)
# =========================================================
#
# Exposed in the Django Admin footer and used as a product/version label.
SYSTEM_VERSION_LABEL = (get_env("SYSTEM_VERSION_LABEL", "beta") or "beta").strip()
SYSTEM_VERSION_DISPLAY = (get_env("SYSTEM_VERSION_DISPLAY", "") or "").strip() or f"Versão {SYSTEM_VERSION_LABEL}"

# =========================================================
# REDIS
# =========================================================

REDIS_URL = get_env("REDIS_URL", "redis://127.0.0.1:6379/1")

# =========================================================
# SUBSTRATO OS RUNTIME (eventos/cache/outbox)
# =========================================================
SUBSTRATO_OS_RUNTIME_ENABLED = get_env("SUBSTRATO_OS_RUNTIME_ENABLED", "false").lower() in (
    "1",
    "true",
    "yes",
    "on",
)
SUBSTRATO_OS_RUNTIME_OFFLINE_ONLY = get_env("SUBSTRATO_OS_RUNTIME_OFFLINE_ONLY", "false").lower() in (
    "1",
    "true",
    "yes",
    "on",
)
SUBSTRATO_OS_OUTBOX_PATH = get_env("SUBSTRATO_OS_OUTBOX_PATH", str(BASE_DIR / "substrato_os_outbox.sqlite3"))

# =========================================================
# TRANSACTIONAL OUTBOX (Django DB)
# =========================================================
TRANSACTIONAL_OUTBOX_ENABLED = get_env("TRANSACTIONAL_OUTBOX_ENABLED", "true").lower() in (
    "1",
    "true",
    "yes",
    "on",
)
TRANSACTIONAL_OUTBOX_RETRY_AFTER_SECONDS = int(get_env("TRANSACTIONAL_OUTBOX_RETRY_AFTER_SECONDS", "30"))
TRANSACTIONAL_OUTBOX_MAX_ATTEMPTS = int(get_env("TRANSACTIONAL_OUTBOX_MAX_ATTEMPTS", "10"))

# =========================================================
# WAREHOUSE MODULAR MONOLITH
# =========================================================
WAREHOUSE_MODULAR_MONOLITH_ENABLED = get_env("WAREHOUSE_MODULAR_MONOLITH_ENABLED", "true").lower() in (
    "1",
    "true",
    "yes",
    "on",
)
WAREHOUSE_EVENT_BACKBONE = get_env("WAREHOUSE_EVENT_BACKBONE", "local").strip().lower()
WAREHOUSE_ANALYTICS_ENABLED = get_env("WAREHOUSE_ANALYTICS_ENABLED", "false").lower() in (
    "1",
    "true",
    "yes",
    "on",
)
WAREHOUSE_KAFKA_TOPIC_PREFIX = get_env("WAREHOUSE_KAFKA_TOPIC_PREFIX", "warehouse")
WAREHOUSE_RABBITMQ_EXCHANGE = get_env("WAREHOUSE_RABBITMQ_EXCHANGE", "warehouse.events")
RABBITMQ_URL = get_env("RABBITMQ_URL", "")
KAFKA_BOOTSTRAP_SERVERS = get_env("KAFKA_BOOTSTRAP_SERVERS", "")

# =========================================================
# IA OPERACIONAL
# =========================================================
AI_ASSISTANT_ENABLED = get_env("AI_ASSISTANT_ENABLED", "true").lower() in (
    "1",
    "true",
    "yes",
    "on",
)
AI_PROVIDER = get_env("AI_PROVIDER", "local")
AI_MODEL = get_env("AI_MODEL", "")
# Provedor Claude real (opcional): AI_PROVIDER=anthropic + ANTHROPIC_API_KEY.
# Sem ambos, a IA usa o provedor local determinístico (default seguro).
ANTHROPIC_API_KEY = get_env("ANTHROPIC_API_KEY", "")
AI_MAX_TOKENS = int(get_env("AI_MAX_TOKENS", "1500"))
AI_TIMEOUT_SECONDS = int(get_env("AI_TIMEOUT_SECONDS", "30"))
AI_MAX_INPUT_TOKENS = int(get_env("AI_MAX_INPUT_TOKENS", "12000"))
AI_MAX_OUTPUT_TOKENS = int(get_env("AI_MAX_OUTPUT_TOKENS", "1200"))
AI_STORE_RAW_MESSAGES = get_env("AI_STORE_RAW_MESSAGES", "false").lower() in (
    "1",
    "true",
    "yes",
    "on",
)
AI_REDACTION_ENABLED = get_env("AI_REDACTION_ENABLED", "true").lower() in (
    "1",
    "true",
    "yes",
    "on",
)
AI_ACTION_CONFIRMATION_REQUIRED = get_env("AI_ACTION_CONFIRMATION_REQUIRED", "true").lower() in (
    "1",
    "true",
    "yes",
    "on",
)
AI_RATE_LIMIT_PER_USER_PER_HOUR = int(get_env("AI_RATE_LIMIT_PER_USER_PER_HOUR", "60"))

# =========================================================
# PROMETHEUS (django-prometheus)
# =========================================================
#
# Em producao, platform.settings.production exige este valor para fechar /metrics.
PROMETHEUS_BEARER_TOKEN = get_env("PROMETHEUS_BEARER_TOKEN", "")

# =========================================================
# OPENTELEMETRY
# =========================================================
OTEL_ENABLED = get_env("OTEL_ENABLED", "false").lower() in ("1", "true", "yes", "on")
OTEL_SERVICE_NAME = get_env("OTEL_SERVICE_NAME", "substrato-backend")
OTEL_EXPORTER_OTLP_ENDPOINT = get_env("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel_collector:4318")
OTEL_TRACES_EXPORTER = get_env("OTEL_TRACES_EXPORTER", "otlp")

# =========================================================
# APPLICATIONS
# =========================================================

DJANGO_APPS = [
    *(["jazzmin"] if _module_available("jazzmin") else []),
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    *(["django_prometheus"] if _module_available("django_prometheus") else []),
    *(["django_celery_beat"] if _module_available("django_celery_beat") else []),
    # CountryField + traducoes de paises.
    *(["django_countries"] if _module_available("django_countries") else []),
    *(["rest_framework"] if _module_available("rest_framework") else []),
    *(["rest_framework_simplejwt"] if _module_available("rest_framework_simplejwt") else []),
    *(["django_filters"] if _module_available("django_filters") else []),
    *(["corsheaders"] if _module_available("corsheaders") else []),
    *(["drf_spectacular"] if _module_available("drf_spectacular") else []),
]

LOCAL_APPS = list(INSTALLED_DOMAIN_APP_CONFIGS)

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# =========================================================
# JAZZMIN (tema do Django Admin)
# =========================================================
#
# Precisa vir ANTES de `django.contrib.admin` para sobrescrever templates/static.

JAZZMIN_SETTINGS = {
    "site_title": "Substrato Admin",
    "site_header": "Substrato",
    "site_brand": "Substrato",
    "site_logo": "img/logo.png",
    "site_logo_classes": "p-1",
    "welcome_sign": "Bem-vindo ao Substrato",
    "copyright": f"Substrato · {SYSTEM_VERSION_DISPLAY}",
    # CSS customizado (gerado via Tailwind; ver `frontend-next/styles/admin-tailwind.input.css`)
    "custom_css": "admin/css/substrato-admin-tailwind.css",
    # Ícones por app/model (Font Awesome 5 Free; chaves são lower-case).
    "icons": {
        # Django built-ins
        "admin": "fas fa-clipboard-list",
        "admin.logentry": "fas fa-clipboard-check",
        "auth": "fas fa-users-cog",
        "auth.group": "fas fa-users",
        "auth.permission": "fas fa-key",
        "contenttypes": "fas fa-database",
        "contenttypes.contenttype": "fas fa-database",
        "sessions": "fas fa-clock",
        "sessions.session": "fas fa-clock",
        # Celery beat
        "django_celery_beat": "fas fa-stopwatch",
        "django_celery_beat.periodictask": "fas fa-tasks",
        "django_celery_beat.periodictasks": "fas fa-layer-group",
        "django_celery_beat.intervalschedule": "fas fa-clock",
        "django_celery_beat.crontabschedule": "fas fa-calendar-alt",
        "django_celery_beat.solarschedule": "fas fa-sun",
        "django_celery_beat.clockedschedule": "fas fa-calendar-check",
        # Substrato apps
        "identidade": "fas fa-user-shield",
        "identidade.usuario": "fas fa-user",
        "identidade.perfilprofissional": "fas fa-id-badge",
        "identidade.passwordresettoken": "fas fa-key",
        "inquilinos": "fas fa-city",
        "inquilinos.inquilino": "fas fa-city",
        "inquilinos.planoassinatura": "fas fa-clipboard-list",
        "inquilinos.assinaturatenant": "fas fa-file-signature",
        "inquilinos.featureflagtenant": "fas fa-toggle-on",
        "inquilinos.configuracaoinquilino": "fas fa-cogs",
        "inquilinos.usotenant": "fas fa-chart-bar",
        "clinico": "fas fa-hospital-user",
        "clinico.paciente": "fas fa-user-injured",
        "clinico.exame": "fas fa-vial",
        "clinico.examecampo": "fas fa-sliders-h",
        "clinico.examemedico": "fas fa-stethoscope",
        "clinico.examemedicocampo": "fas fa-clipboard-list",
        "clinico.requisicaoanalise": "fas fa-file-medical-alt",
        "clinico.requisicaoitem": "fas fa-file-medical",
        "clinico.resultado": "fas fa-notes-medical",
        "clinico.resultadoitem": "fas fa-clipboard-check",
        "clinico.historicoclinico": "fas fa-book-medical",
        "clinico.referenciaclinica": "fas fa-hand-holding-medical",
        "clinico.eventoclinico": "fas fa-bell",
        "odontologia": "fas fa-tooth",
        "odontologia.dentalprocedure": "fas fa-tooth",
        "odontologia.dentalappointment": "fas fa-calendar-check",
        "odontologia.dentalrecord": "fas fa-notes-medical",
        "odontologia.dentalodontogramentry": "fas fa-teeth",
        "odontologia.dentaltreatmentplan": "fas fa-clipboard-list",
        "odontologia.dentaltreatmentplanitem": "fas fa-tasks",
        "odontologia.dentalprosthesislaborder": "fas fa-teeth-open",
        "veterinaria": "fas fa-paw",
        "veterinaria.veterinaryanimal": "fas fa-paw",
        "veterinaria.veterinaryappointment": "fas fa-calendar-check",
        "veterinaria.veterinarymedicalrecord": "fas fa-notes-medical",
        "veterinaria.veterinaryvaccine": "fas fa-syringe",
        "veterinaria.veterinaryvaccination": "fas fa-shield-alt",
        "veterinaria.veterinarylabexam": "fas fa-vial",
        "veterinaria.veterinarylabrequest": "fas fa-file-medical-alt",
        "veterinaria.veterinarylabrequestitem": "fas fa-clipboard-check",
        "veterinaria.veterinaryadmission": "fas fa-hospital",
        "veterinaria.veterinaryprescription": "fas fa-prescription-bottle-alt",
        "veterinaria.veterinaryprescriptionitem": "fas fa-pills",
        "fisioterapia": "fas fa-running",
        "fisioterapia.physiotherapydevice": "fas fa-dumbbell",
        "fisioterapia.functionalassessment": "fas fa-clipboard-check",
        "fisioterapia.rehabilitationtreatmentplan": "fas fa-clipboard-list",
        "fisioterapia.treatmentplanintervention": "fas fa-tasks",
        "fisioterapia.rehabilitationsession": "fas fa-calendar-check",
        "fisioterapia.rehabilitationprogressnote": "fas fa-chart-line",
        "fisioterapia.rehabilitationdeviceusage": "fas fa-sliders-h",
        "patologia": "fas fa-microscope",
        "patologia.pathologysamplereception": "fas fa-vial",
        "patologia.pathologygrossexamination": "fas fa-search-plus",
        "patologia.pathologyprocessing": "fas fa-cogs",
        "patologia.pathologyhistologyslide": "fas fa-microscope",
        "patologia.pathologycytologycase": "fas fa-diagnoses",
        "patologia.pathologyimmunohistochemistry": "fas fa-flask",
        "patologia.pathologyreport": "fas fa-file-medical-alt",
        "patologia.pathologyarchive": "fas fa-archive",
        "radiologia": "fas fa-x-ray",
        "radiologia.imagingequipment": "fas fa-procedures",
        "radiologia.imagingprotocol": "fas fa-clipboard-list",
        "radiologia.imagingstudy": "fas fa-x-ray",
        "radiologia.imagingseries": "fas fa-layer-group",
        "radiologia.imagingfile": "fas fa-file-image",
        "radiologia.imagingreport": "fas fa-file-medical-alt",
        "radiologia.pacsintegrationevent": "fas fa-network-wired",
        "terapias": "fas fa-hands-helping",
        "terapias.therapeuticresource": "fas fa-toolbox",
        "terapias.therapyevaluation": "fas fa-clipboard-check",
        "terapias.therapytreatmentplan": "fas fa-clipboard-list",
        "terapias.therapyplangoal": "fas fa-bullseye",
        "terapias.therapysession": "fas fa-calendar-check",
        "terapias.therapyprogressnote": "fas fa-chart-line",
        "terapias.therapyprescriptionlink": "fas fa-prescription",
        "diagnosticos": "fas fa-heartbeat",
        "diagnosticos.specialtydiagnosticequipment": "fas fa-stethoscope",
        "diagnosticos.specialtydiagnosticprotocol": "fas fa-clipboard-list",
        "diagnosticos.specialtydiagnosticorder": "fas fa-file-medical",
        "diagnosticos.specialtydiagnosticmeasurement": "fas fa-chart-line",
        "diagnosticos.specialtydiagnosticreport": "fas fa-file-medical-alt",
        "diagnosticos.specialtydiagnosticintegrationevent": "fas fa-network-wired",
        "farmacia_clinica": "fas fa-syringe",
        "farmacia_clinica.clinicalpharmacyivpreparation": "fas fa-prescription-bottle",
        "farmacia_clinica.clinicalpharmacyingredient": "fas fa-vial",
        "farmacia_clinica.druginteractionrule": "fas fa-exclamation-triangle",
        "farmacia_clinica.medicationinteractioncheck": "fas fa-shield-alt",
        "farmacia_clinica.controlledsubstancemovement": "fas fa-lock",
        "farmacia_clinica.antibioticstewardshipreview": "fas fa-bacteria",
        "creditos_financiamento": "fas fa-hand-holding-usd",
        "creditos_financiamento.healthconsortium": "fas fa-users",
        "creditos_financiamento.electiveprocedurefinancing": "fas fa-credit-card",
        "creditos_financiamento.creditinstallment": "fas fa-calendar-alt",
        "creditos_financiamento.reimbursementclaim": "fas fa-file-invoice-dollar",
        "creditos_financiamento.studentfunding": "fas fa-graduation-cap",
        "transportation": "fas fa-truck",
        "transportation.vehicle": "fas fa-truck",
        "transportation.driver": "fas fa-id-card",
        "transportation.transportationroute": "fas fa-route",
        "transportation.routestop": "fas fa-map-marker-alt",
        "transportation.trip": "fas fa-road",
        "transportation.vehicletrackingpoint": "fas fa-location-arrow",
        "transportation.maintenanceplan": "fas fa-clipboard-list",
        "transportation.maintenanceorder": "fas fa-tools",
        "transportation.fuellog": "fas fa-gas-pump",
        "prontuario": "fas fa-notes-medical",
        "prontuario.registroprontuario": "fas fa-book-medical",
        "prontuario.prescricaoitem": "fas fa-pills",
        "consultas": "fas fa-stethoscope",
        "consultas.consultamedica": "fas fa-calendar-check",
        "consultas.especialidadeconsulta": "fas fa-sitemap",
        "consultas.feriado": "fas fa-calendar-day",
        "education": "fas fa-graduation-cap",
        "education.studentprofile": "fas fa-user-graduate",
        "education.teacherprofile": "fas fa-chalkboard-teacher",
        "education.course": "fas fa-book-open",
        "education.classroom": "fas fa-school",
        "education.enrollment": "fas fa-clipboard-check",
        "education.attendancerecord": "fas fa-user-check",
        "education.graderecord": "fas fa-percent",
        "education.examination": "fas fa-file-signature",
        "education.examinationattempt": "fas fa-redo-alt",
        "education.randomtest": "fas fa-random",
        "education.assignment": "fas fa-tasks",
        "education.assignmentsubmission": "fas fa-file-upload",
        "education.learningcontent": "fas fa-folder-open",
        "education.disciplinescheduleitem": "fas fa-calendar-alt",
        "education.disciplineschedulestudentstatus": "fas fa-user-clock",
        "education.skill": "fas fa-award",
        "maternidade": "fas fa-baby",
        "maternidade.gestacao": "fas fa-baby",
        "enfermagem": "fas fa-user-nurse",
        "enfermagem.enfermaria": "fas fa-bed",
        "enfermagem.camaenfermaria": "fas fa-bed",
        "enfermagem.internamentoenfermaria": "fas fa-hospital",
        "enfermagem.registroenfermagem": "fas fa-notes-medical",
        "enfermagem.sinalvitalenfermagem": "fas fa-heartbeat",
        "enfermagem.evolucaoenfermagem": "fas fa-chart-line",
        "enfermagem.prescricaoenfermagem": "fas fa-prescription-bottle-alt",
        "enfermagem.procedimento": "fas fa-syringe",
        "enfermagem.procedimentocatalogo": "fas fa-th-list",
        "enfermagem.procedimentocatalogomaterial": "fas fa-boxes",
        "enfermagem.procedimentoitem": "fas fa-list",
        "enfermagem.procedimentoitemvalor": "fas fa-tag",
        "enfermagem.procedimentomaterial": "fas fa-box",
        "enfermagem.procedimentomaterialvalor": "fas fa-tag",
        "farmacia": "fas fa-prescription-bottle-alt",
        "farmacia.categoriapai": "fas fa-sitemap",
        "farmacia.categoriaproduto": "fas fa-tags",
        "farmacia.produto": "fas fa-pills",
        "farmacia.lote": "fas fa-barcode",
        "farmacia.movimentoestoque": "fas fa-exchange-alt",
        "farmacia.venda": "fas fa-cash-register",
        "farmacia.itemvenda": "fas fa-receipt",
        "warehouse": "fas fa-warehouse",
        "warehouse.warehouse": "fas fa-warehouse",
        "warehouse.storagelocation": "fas fa-map-marker-alt",
        "warehouse.warehouseitemcategory": "fas fa-tags",
        "warehouse.warehouseitem": "fas fa-box",
        "warehouse.warehouselot": "fas fa-barcode",
        "warehouse.stocklevel": "fas fa-layer-group",
        "warehouse.stockmovement": "fas fa-exchange-alt",
        "warehouse.replenishmentplan": "fas fa-project-diagram",
        "warehouse.replenishmentsuggestion": "fas fa-lightbulb",
        "warehouse.salesorder": "fas fa-shopping-cart",
        "warehouse.salesorderline": "fas fa-list-ol",
        "warehouse.stockreservation": "fas fa-bookmark",
        "warehouse.picklist": "fas fa-clipboard-list",
        "warehouse.picklistline": "fas fa-tasks",
        "warehouse.shipment": "fas fa-shipping-fast",
        "warehouse.shipmentline": "fas fa-box-open",
        "warehouse.purchaseorder": "fas fa-file-invoice",
        "warehouse.purchaseorderline": "fas fa-list",
        "warehouse.goodsreceipt": "fas fa-dolly",
        "warehouse.goodsreceiptline": "fas fa-list-ul",
        "warehouse.stocktransfer": "fas fa-truck-loading",
        "warehouse.stocktransferline": "fas fa-route",
        "warehouse.cyclecount": "fas fa-clipboard-check",
        "warehouse.cyclecountline": "fas fa-tasks",
        "bloodbank": "fas fa-tint",
        "bloodbank.blooddonation": "fas fa-hand-holding-medical",
        "bloodbank.bloodunit": "fas fa-box-open",
        "bloodbank.bloodtransfusion": "fas fa-heartbeat",
        "bloodbank.bloodstorage": "fas fa-warehouse",
        "bloodbank.bloodstockmovement": "fas fa-exchange-alt",
        "bloodbank.bloodstoragemaintenance": "fas fa-tools",
        "faturamento": "fas fa-file-invoice-dollar",
        "faturamento.fatura": "fas fa-file-invoice-dollar",
        "faturamento.faturaitem": "fas fa-list-ul",
        "faturamento.historicofatura": "fas fa-history",
        "pagamentos": "fas fa-money-check-alt",
        "pagamentos.pagamento": "fas fa-money-bill-wave",
        "pagamentos.transacao": "fas fa-exchange-alt",
        "pagamentos.recibo": "fas fa-receipt",
        "pagamentos.reconciliacao": "fas fa-balance-scale",
        "pagamentos.historicopagamento": "fas fa-history",
        "contabilidade": "fas fa-calculator",
        "contabilidade.conta": "fas fa-wallet",
        "contabilidade.lancamento": "fas fa-pen-fancy",
        "contabilidade.movimento": "fas fa-arrows-alt-h",
        "contabilidade.conciliacaofinanceira": "fas fa-balance-scale",
        "contabilidade.ledgerentry": "fas fa-book",
        "contabilidade.ledgerline": "fas fa-stream",
        "contabilidade.saldoconta": "fas fa-chart-pie",
        "recepcao": "fas fa-concierge-bell",
        "recepcao.checkinrecepcao": "fas fa-clipboard-check",
        "entidades": "fas fa-building",
        "entidades.empresa": "fas fa-industry",
        "seguradora": "fas fa-shield-alt",
        "seguradora.seguradora": "fas fa-shield-alt",
        "seguradora.planocobertura": "fas fa-clipboard-list",
        "seguradora.autorizacaoprocedimento": "fas fa-stamp",
        "seguradora.tenantplanocobertura": "fas fa-link",
        "notificacoes": "fas fa-bell",
        "notificacoes.notificacao": "fas fa-paper-plane",
        "notificacoes.templatenotificacao": "fas fa-file-alt",
        "notificacoes.logenvio": "fas fa-clipboard-check",
        "ocorrencias": "fas fa-exclamation-triangle",
        "ocorrencias.incident": "fas fa-exclamation-triangle",
        "auditoria_atividades": "fas fa-clipboard-list",
        "audit_activities.atividadeusuario": "fas fa-user-clock",
        "cirurgia": "fas fa-procedures",
        "cirurgia.cirurgia": "fas fa-procedures",
        "cirurgia.smallsurgery": "fas fa-cut",
        "cirurgia.largesurgery": "fas fa-hospital",
        "cirurgia.procedimentocirurgico": "fas fa-syringe",
        "integracoes_equipamentos": "fas fa-microchip",
        "integracoes_equipamentos.integrationequipment": "fas fa-microscope",
        "integracoes_equipamentos.integrationcredential": "fas fa-key",
        "integracoes_equipamentos.integrationdocument": "fas fa-file-alt",
        "integracoes_equipamentos.integrationanalytemapping": "fas fa-project-diagram",
        "integracoes_equipamentos.integrationmessage": "fas fa-envelope-open-text",
        "integracoes_equipamentos.integrationorder": "fas fa-tasks",
        "integracoes_equipamentos.integrationorderitem": "fas fa-list-ol",
        "integracoes_equipamentos.integrationrouting": "fas fa-route",
        "recursos_humanos": "fas fa-users",
        "recursos_humanos.employee": "fas fa-user-tie",
        "recursos_humanos.jobtitle": "fas fa-briefcase",
        "recursos_humanos.familydependent": "fas fa-user-friends",
        "recursos_humanos.absence": "fas fa-user-times",
        "recursos_humanos.vacation": "fas fa-umbrella-beach",
        "recursos_humanos.payroll": "fas fa-file-invoice",
        "recursos_humanos.termination": "fas fa-user-slash",
        "recursos_humanos.overtime": "fas fa-clock",
        "recursos_humanos.workschedule": "fas fa-calendar-alt",
        "monitoramento": "fas fa-heartbeat",
        "monitoramento.errosistema": "fas fa-bug",
        "monitoramento.transactionaloutboxevent": "fas fa-stream",
        "ai_assistant": "fas fa-robot",
        "ai_assistant.aisession": "fas fa-comments",
        "ai_assistant.aimessage": "fas fa-comment-dots",
        "ai_assistant.aitoolcall": "fas fa-terminal",
        "ai_assistant.aisuggestedaction": "fas fa-magic",
        "ai_assistant.aioperationaltask": "fas fa-tasks",
        "ai_assistant.aiinvestigation": "fas fa-search",
        "ai_assistant.aiknowledgeentry": "fas fa-brain",
        "ai_assistant.aipolicyevent": "fas fa-shield-alt",
    },
    # Ordena apps e models no menu lateral do Admin (Jazzmin).
    # Priorização operacional: Recepção → Clínica (Laboratório) → Enfermagem → Farmácia → Logística → Financeiro → Consultas/Prontuário → Operação/Config → RH → Infra/Tech
    "order_with_respect_to": [
        # Fluxo principal
        "recepcao",
        "recepcao.checkinrecepcao",
        "clinico",
        "clinico.paciente",
        "clinico.requisicaoanalise",
        "clinico.requisicaoitem",
        "clinico.resultado",
        "clinico.resultadoitem",
        "clinico.exame",
        "clinico.examecampo",
        "clinico.referenciaclinica",
        "clinico.historicoclinico",
        "clinico.eventoclinico",
        "clinico.examemedico",
        "clinico.examemedicocampo",
        "odontologia",
        "odontologia.dentalappointment",
        "odontologia.dentalrecord",
        "odontologia.dentalodontogramentry",
        "odontologia.dentaltreatmentplan",
        "odontologia.dentaltreatmentplanitem",
        "odontologia.dentalprosthesislaborder",
        "odontologia.dentalprocedure",
        "veterinaria",
        "veterinaria.veterinaryanimal",
        "veterinaria.veterinaryappointment",
        "veterinaria.veterinarymedicalrecord",
        "veterinaria.veterinaryvaccine",
        "veterinaria.veterinaryvaccination",
        "veterinaria.veterinarylabexam",
        "veterinaria.veterinarylabrequest",
        "veterinaria.veterinarylabrequestitem",
        "veterinaria.veterinaryadmission",
        "veterinaria.veterinaryprescription",
        "veterinaria.veterinaryprescriptionitem",
        "fisioterapia",
        "fisioterapia.physiotherapydevice",
        "fisioterapia.functionalassessment",
        "fisioterapia.rehabilitationtreatmentplan",
        "fisioterapia.treatmentplanintervention",
        "fisioterapia.rehabilitationsession",
        "fisioterapia.rehabilitationprogressnote",
        "fisioterapia.rehabilitationdeviceusage",
        "patologia",
        "patologia.pathologysamplereception",
        "patologia.pathologygrossexamination",
        "patologia.pathologyprocessing",
        "patologia.pathologyhistologyslide",
        "patologia.pathologycytologycase",
        "patologia.pathologyimmunohistochemistry",
        "patologia.pathologyreport",
        "patologia.pathologyarchive",
        "radiologia",
        "radiologia.imagingequipment",
        "radiologia.imagingprotocol",
        "radiologia.imagingstudy",
        "radiologia.imagingseries",
        "radiologia.imagingfile",
        "radiologia.imagingreport",
        "radiologia.pacsintegrationevent",
        "terapias",
        "terapias.therapeuticresource",
        "terapias.therapyevaluation",
        "terapias.therapytreatmentplan",
        "terapias.therapyplangoal",
        "terapias.therapysession",
        "terapias.therapyprogressnote",
        "terapias.therapyprescriptionlink",
        "diagnosticos",
        "diagnosticos.specialtydiagnosticequipment",
        "diagnosticos.specialtydiagnosticprotocol",
        "diagnosticos.specialtydiagnosticorder",
        "diagnosticos.specialtydiagnosticmeasurement",
        "diagnosticos.specialtydiagnosticreport",
        "diagnosticos.specialtydiagnosticintegrationevent",
        "farmacia_clinica",
        "farmacia_clinica.clinicalpharmacyivpreparation",
        "farmacia_clinica.clinicalpharmacyingredient",
        "farmacia_clinica.druginteractionrule",
        "farmacia_clinica.medicationinteractioncheck",
        "farmacia_clinica.controlledsubstancemovement",
        "farmacia_clinica.antibioticstewardshipreview",
        "creditos_financiamento",
        "creditos_financiamento.healthconsortium",
        "creditos_financiamento.electiveprocedurefinancing",
        "creditos_financiamento.creditinstallment",
        "creditos_financiamento.reimbursementclaim",
        "creditos_financiamento.studentfunding",
        "saude_publica",
        "saude_publica.vaccineproduct",
        "saude_publica.vaccinelot",
        "saude_publica.vaccinationcampaign",
        "saude_publica.vaccinationcampaigntarget",
        "saude_publica.immunizationrecord",
        "saude_publica.adverseeventfollowingimmunization",
        "saude_publica.publichealthnotification",
        "transportation",
        "transportation.vehicle",
        "transportation.driver",
        "transportation.transportationroute",
        "transportation.routestop",
        "transportation.trip",
        "transportation.vehicletrackingpoint",
        "transportation.maintenanceplan",
        "transportation.maintenanceorder",
        "transportation.fuellog",
        "enfermagem",
        "enfermagem.enfermaria",
        "enfermagem.camaenfermaria",
        "enfermagem.internamentoenfermaria",
        "enfermagem.registroenfermagem",
        "enfermagem.sinalvitalenfermagem",
        "enfermagem.evolucaoenfermagem",
        "enfermagem.prescricaoenfermagem",
        "enfermagem.procedimento",
        "enfermagem.procedimentoitem",
        "enfermagem.procedimentomaterial",
        "enfermagem.procedimentocatalogo",
        "enfermagem.procedimentocatalogomaterial",
        "enfermagem.procedimentoitemvalor",
        "enfermagem.procedimentomaterialvalor",
        "farmacia",
        "farmacia.categoriapai",
        "farmacia.categoriaproduto",
        "farmacia.produto",
        "farmacia.lote",
        "farmacia.movimentoestoque",
        "farmacia.venda",
        "farmacia.itemvenda",
        "warehouse",
        "warehouse.warehouse",
        "warehouse.storagelocation",
        "warehouse.warehouseitemcategory",
        "warehouse.warehouseitem",
        "warehouse.warehouselot",
        "warehouse.stocklevel",
        "warehouse.stockmovement",
        "warehouse.replenishmentplan",
        "warehouse.replenishmentsuggestion",
        "warehouse.salesorder",
        "warehouse.salesorderline",
        "warehouse.stockreservation",
        "warehouse.picklist",
        "warehouse.picklistline",
        "warehouse.shipment",
        "warehouse.shipmentline",
        "warehouse.purchaseorder",
        "warehouse.purchaseorderline",
        "warehouse.goodsreceipt",
        "warehouse.goodsreceiptline",
        "warehouse.stocktransfer",
        "warehouse.stocktransferline",
        "warehouse.cyclecount",
        "warehouse.cyclecountline",
        "bloodbank",
        "bloodbank.blooddonation",
        "bloodbank.bloodunit",
        "bloodbank.bloodtransfusion",
        "bloodbank.bloodstorage",
        "bloodbank.bloodstockmovement",
        "bloodbank.bloodstoragemaintenance",
        # Financeiro
        "faturamento",
        "faturamento.fatura",
        "faturamento.faturaitem",
        "faturamento.historicofatura",
        "pagamentos",
        "pagamentos.pagamento",
        "pagamentos.recibo",
        "pagamentos.transacao",
        "pagamentos.reconciliacao",
        "pagamentos.historicopagamento",
        "contabilidade",
        "contabilidade.conta",
        "contabilidade.lancamento",
        "contabilidade.movimento",
        "contabilidade.conciliacaofinanceira",
        "contabilidade.ledgerentry",
        "contabilidade.ledgerline",
        "contabilidade.saldoconta",
        # Clínica
        "consultas",
        "consultas.consultamedica",
        "consultas.especialidadeconsulta",
        "consultas.feriado",
        "education",
        "education.studentprofile",
        "education.teacherprofile",
        "education.course",
        "education.classroom",
        "education.enrollment",
        "education.attendancerecord",
        "education.graderecord",
        "education.examination",
        "education.examinationattempt",
        "education.randomtest",
        "education.assignment",
        "education.assignmentsubmission",
        "education.learningcontent",
        "education.disciplinescheduleitem",
        "education.disciplineschedulestudentstatus",
        "education.skill",
        "prontuario",
        "prontuario.registroprontuario",
        "prontuario.prescricaoitem",
        "maternidade",
        "maternidade.gestacao",
        "cirurgia",
        "cirurgia.procedimentocirurgico",
        "cirurgia.cirurgia",
        "cirurgia.smallsurgery",
        "cirurgia.largesurgery",
        "cirurgia.surgicalschedule",
        "cirurgia.operatingroom",
        "cirurgia.surgicalteammember",
        "cirurgia.anesthesiarecord",
        "cirurgia.surgicalsafetychecklist",
        "cirurgia.surgicalmaterial",
        "cirurgia.surgicalconsumption",
        "cirurgia.recoveryrecord",
        "cirurgia.operativereport",
        # Operação/Config
        "entidades",
        "entidades.empresa",
        "seguradora",
        "seguradora.seguradora",
        "seguradora.planocobertura",
        "seguradora.tenantplanocobertura",
        "seguradora.autorizacaoprocedimento",
        "notificacoes",
        "notificacoes.templatenotificacao",
        "notificacoes.notificacao",
        "notificacoes.logenvio",
        "auditoria_atividades",
        "audit_activities.atividadeusuario",
        "integracoes_equipamentos",
        "integracoes_equipamentos.integrationequipment",
        "integracoes_equipamentos.integrationdocument",
        "integracoes_equipamentos.integrationcredential",
        "integracoes_equipamentos.integrationanalytemapping",
        "integracoes_equipamentos.integrationmessage",
        "integracoes_equipamentos.integrationorder",
        "integracoes_equipamentos.integrationorderitem",
        "integracoes_equipamentos.integrationrouting",
        "recursos_humanos",
        "recursos_humanos.employee",
        "recursos_humanos.jobtitle",
        "recursos_humanos.familydependent",
        "recursos_humanos.workschedule",
        "recursos_humanos.vacation",
        "recursos_humanos.absence",
        "recursos_humanos.termination",
        "recursos_humanos.payroll",
        "recursos_humanos.overtime",
        "monitoramento",
        "monitoramento.errosistema",
        "monitoramento.transactionaloutboxevent",
        "ai_assistant",
        "ai_assistant.aisession",
        "ai_assistant.aimessage",
        "ai_assistant.aitoolcall",
        "ai_assistant.aisuggestedaction",
        "ai_assistant.aioperationaltask",
        "ai_assistant.aiinvestigation",
        "ai_assistant.aiknowledgeentry",
        "ai_assistant.aipolicyevent",
        "inquilinos",
        "inquilinos.inquilino",
        "inquilinos.planoassinatura",
        "inquilinos.assinaturatenant",
        "inquilinos.featureflagtenant",
        "inquilinos.configuracaoinquilino",
        "inquilinos.usotenant",
        "identidade",
        "identidade.usuario",
        "identidade.perfilprofissional",
        "identidade.passwordresettoken",
        # Tech/Admin (no fim)
        "django_celery_beat",
        "django_celery_beat.periodictask",
        "django_celery_beat.periodictasks",
        "django_celery_beat.intervalschedule",
        "django_celery_beat.crontabschedule",
        "django_celery_beat.solarschedule",
        "django_celery_beat.clockedschedule",
        "auth",
        "auth.group",
        "auth.permission",
        "admin",
        "admin.logentry",
        "contenttypes",
        "contenttypes.contenttype",
        "sessions",
        "sessions.session",
    ],
    "default_icon_parents": "fas fa-layer-group",
    "default_icon_children": "far fa-dot-circle",
}

# ---------------------------------------------------------
# Jazzmin icons: compatibilidade de chaves legado -> canónico
# ---------------------------------------------------------
# Em várias apps, os labels/model_names reais (admin) diferem dos nomes legados
# usados historicamente nesta configuração. Para garantir que os ícones apareçam
# no menu lateral e no dashboard, mapeamos aliases e aplicamos fallback.
_JAZZMIN_ICON_ALIASES = {
    # App-level
    "clinical": "clinico",
    # Identity
    "identidade.user": "identidade.usuario",
    # Tenants
    "inquilinos.tenant": "inquilinos.inquilino",
    "inquilinos.tenantconfiguration": "inquilinos.configuracaoinquilino",
    "inquilinos.subscriptionplan": "inquilinos.planoassinatura",
    "inquilinos.tenantsubscription": "inquilinos.assinaturatenant",
    "inquilinos.tenantfeatureflag": "inquilinos.featureflagtenant",
    "inquilinos.tenantusage": "inquilinos.usotenant",
    # Identity
    "identidade.professionalprofile": "identidade.perfilprofissional",
    # Clinical
    "clinical.patient": "clinico.paciente",
    "clinical.labexam": "clinico.exame",
    "clinical.labexamfield": "clinico.examecampo",
    "clinical.medicalexam": "clinico.examemedico",
    "clinical.labrequest": "clinico.requisicaoanalise",
    "clinical.labrequestitem": "clinico.requisicaoitem",
    "clinical.result": "clinico.resultado",
    "clinical.resultitem": "clinico.resultadoitem",
    "clinical.clinicalhistory": "clinico.historicoclinico",
    "clinical.clinicalreference": "clinico.referenciaclinica",
    "clinical.clinicalevent": "clinico.eventoclinico",
    "clinical.sample": "clinico.resultadoitem",
    # Medical records
    "prontuario.medicalrecordentry": "prontuario.registroprontuario",
    "prontuario.prescriptionitem": "prontuario.prescricaoitem",
    # Consultations
    "consultas.medicalconsultation": "consultas.consultamedica",
    "consultas.consultationspecialty": "consultas.especialidadeconsulta",
    "consultas.holiday": "consultas.feriado",
    # Maternity
    "maternidade.pregnancy": "maternidade.gestacao",
    # Nursing
    "enfermagem.ward": "enfermagem.enfermaria",
    "enfermagem.wardbed": "enfermagem.camaenfermaria",
    "enfermagem.wardadmission": "enfermagem.internamentoenfermaria",
    "enfermagem.nursingrecord": "enfermagem.registroenfermagem",
    "enfermagem.nursingvitalsign": "enfermagem.sinalvitalenfermagem",
    "enfermagem.nursingevolution": "enfermagem.evolucaoenfermagem",
    "enfermagem.nursingprescription": "enfermagem.prescricaoenfermagem",
    "enfermagem.procedure": "enfermagem.procedimento",
    "enfermagem.procedurecatalog": "enfermagem.procedimentocatalogo",
    "enfermagem.procedurecatalogmaterial": "enfermagem.procedimentocatalogomaterial",
    "enfermagem.procedureitem": "enfermagem.procedimentoitem",
    "enfermagem.procedureitemvalue": "enfermagem.procedimentoitemvalor",
    "enfermagem.procedurematerial": "enfermagem.procedimentomaterial",
    "enfermagem.procedurematerialvalue": "enfermagem.procedimentomaterialvalor",
    # Pharmacy
    "farmacia.inventorymovement": "farmacia.movimentoestoque",
    "farmacia.parentcategory": "farmacia.categoriapai",
    "farmacia.productcategory": "farmacia.categoriaproduto",
    "farmacia.product": "farmacia.produto",
    "farmacia.sale": "farmacia.venda",
    "farmacia.saleitem": "farmacia.itemvenda",
    # Billing
    "faturamento.invoice": "faturamento.fatura",
    "faturamento.invoiceitem": "faturamento.faturaitem",
    "faturamento.invoicehistory": "faturamento.historicofatura",
    # Payments
    "payments": "pagamentos",
    "pagamentos.payment": "pagamentos.pagamento",
    "pagamentos.transaction": "pagamentos.transacao",
    "pagamentos.receipt": "pagamentos.recibo",
    "pagamentos.reconciliation": "pagamentos.reconciliacao",
    "pagamentos.paymenthistory": "pagamentos.historicopagamento",
    # Accounting
    "contabilidade.account": "contabilidade.conta",
    "contabilidade.legacyentry": "contabilidade.lancamento",
    "contabilidade.legacymovement": "contabilidade.movimento",
    "contabilidade.financialreconciliation": "contabilidade.conciliacaofinanceira",
    "contabilidade.accountbalance": "contabilidade.saldoconta",
    # External entities
    "entidades.company": "entidades.empresa",
    # Insurer
    "seguradora.insurer": "seguradora.seguradora",
    "seguradora.coverageplan": "seguradora.planocobertura",
    "seguradora.tenantcoverageplan": "seguradora.tenantplanocobertura",
    "seguradora.procedureauthorization": "seguradora.autorizacaoprocedimento",
    # Notifications
    "notificacoes.notification": "notificacoes.notificacao",
    "notificacoes.notificationtemplate": "notificacoes.templatenotificacao",
    "notificacoes.deliverylog": "notificacoes.logenvio",
    # Monitoring
    "monitoramento.systemerror": "monitoramento.errosistema",
    "monitoring.transactionaloutboxevent": "monitoramento.transactionaloutboxevent",
    # Education
    "education.student": "education.studentprofile",
    "education.teacher": "education.teacherprofile",
    "education.attendance": "education.attendancerecord",
    "education.grade": "education.graderecord",
    "education.content": "education.learningcontent",
    # Surgery
    "cirurgia.surgery": "cirurgia.cirurgia",
    "cirurgia.surgicalprocedure": "cirurgia.procedimentocirurgico",
    "surgery.smallsurgery": "cirurgia.smallsurgery",
    "surgery.largesurgery": "cirurgia.largesurgery",
    "cirurgia.surgicalschedule": "cirurgia.surgicalschedule",
    "cirurgia.operatingroom": "cirurgia.operatingroom",
    "cirurgia.surgicalteammember": "cirurgia.surgicalteammember",
    "cirurgia.anesthesiarecord": "cirurgia.anesthesiarecord",
    "cirurgia.surgicalsafetychecklist": "cirurgia.surgicalsafetychecklist",
    "cirurgia.surgicalmaterial": "cirurgia.surgicalmaterial",
    "cirurgia.surgicalconsumption": "cirurgia.surgicalconsumption",
    "cirurgia.recoveryrecord": "cirurgia.recoveryrecord",
    "cirurgia.operativereport": "cirurgia.operativereport",
    # Equipment related apps
    "inspecoes.dailyinspection": "equipamentos.inspecaodiaria",
    "manutencoes.maintenance": "equipamentos.manutencao",
    # Audit activities
    "auditoria_atividades.useractivity": "audit_activities.atividadeusuario",
    # Reception
    "recepcao.receptioncheckin": "recepcao.checkinrecepcao",
}

_JAZZMIN_ICON_DEFAULTS = {
    # App-level (dashboard/sidebar groups)
    "clinical": "fas fa-hospital-user",
    "identidade": "fas fa-user-shield",
    "inquilinos": "fas fa-city",
    "consultas": "fas fa-stethoscope",
    "education": "fas fa-graduation-cap",
    "prontuario": "fas fa-notes-medical",
    "maternidade": "fas fa-baby",
    "enfermagem": "fas fa-user-nurse",
    "farmacia": "fas fa-prescription-bottle-alt",
    "warehouse": "fas fa-warehouse",
    "bloodbank": "fas fa-tint",
    "faturamento": "fas fa-file-invoice-dollar",
    "pagamentos": "fas fa-money-check-alt",
    "payments": "fas fa-money-check-alt",
    "contabilidade": "fas fa-calculator",
    "entidades": "fas fa-building",
    "seguradora": "fas fa-shield-alt",
    "notificacoes": "fas fa-bell",
    "monitoramento": "fas fa-heartbeat",
    "telemedicina": "fas fa-video",
    "saude_publica": "fas fa-syringe",
    "ai_assistant": "fas fa-robot",
    "cirurgia": "fas fa-procedures",
    "equipamentos": "fas fa-tools",
    "inspecoes": "fas fa-clipboard-check",
    "manutencoes": "fas fa-wrench",
    "ocorrencias": "fas fa-exclamation-triangle",
    "integracoes_equipamentos": "fas fa-microchip",
    "auditoria_atividades": "fas fa-clipboard-list",
    "recursos_humanos": "fas fa-users",
    # Canonical model-level keys (admin registry)
    "clinical.patient": "fas fa-user-injured",
    "clinical.labexam": "fas fa-vial",
    "clinical.labexamfield": "fas fa-sliders-h",
    "clinical.medicalexam": "fas fa-stethoscope",
    "clinical.labrequest": "fas fa-file-medical-alt",
    "clinical.labrequestitem": "fas fa-file-medical",
    "clinical.result": "fas fa-notes-medical",
    "clinical.resultitem": "fas fa-clipboard-check",
    "clinical.clinicalhistory": "fas fa-book-medical",
    "clinical.clinicalreference": "fas fa-hand-holding-medical",
    "clinical.clinicalevent": "fas fa-bell",
    "clinical.medicalresultfile": "fas fa-file-medical",
    "clinical.sample": "fas fa-vials",
    "identidade.user": "fas fa-user",
    "identidade.professionalprofile": "fas fa-id-badge",
    "inquilinos.tenant": "fas fa-city",
    "inquilinos.tenantconfiguration": "fas fa-cogs",
    "inquilinos.subscriptionplan": "fas fa-clipboard-list",
    "inquilinos.tenantsubscription": "fas fa-file-signature",
    "inquilinos.tenantfeatureflag": "fas fa-toggle-on",
    "inquilinos.tenantusage": "fas fa-chart-bar",
    "consultas.medicalconsultation": "fas fa-calendar-check",
    "consultas.consultationspecialty": "fas fa-sitemap",
    "consultas.holiday": "fas fa-calendar-day",
    "education.studentprofile": "fas fa-user-graduate",
    "education.teacherprofile": "fas fa-chalkboard-teacher",
    "education.course": "fas fa-book-open",
    "education.classroom": "fas fa-school",
    "education.enrollment": "fas fa-clipboard-check",
    "education.attendancerecord": "fas fa-user-check",
    "education.graderecord": "fas fa-percent",
    "education.examination": "fas fa-file-signature",
    "education.examinationattempt": "fas fa-redo-alt",
    "education.randomtest": "fas fa-random",
    "education.assignment": "fas fa-tasks",
    "education.assignmentsubmission": "fas fa-file-upload",
    "education.learningcontent": "fas fa-folder-open",
    "education.disciplinescheduleitem": "fas fa-calendar-alt",
    "education.disciplineschedulestudentstatus": "fas fa-user-clock",
    "education.skill": "fas fa-award",
    "prontuario.medicalrecordentry": "fas fa-book-medical",
    "prontuario.prescriptionitem": "fas fa-pills",
    "maternidade.pregnancy": "fas fa-baby",
    "enfermagem.ward": "fas fa-bed",
    "enfermagem.wardbed": "fas fa-bed",
    "enfermagem.wardadmission": "fas fa-hospital",
    "enfermagem.nursingrecord": "fas fa-notes-medical",
    "enfermagem.nursingvitalsign": "fas fa-heartbeat",
    "enfermagem.nursingevolution": "fas fa-chart-line",
    "enfermagem.nursingprescription": "fas fa-prescription-bottle-alt",
    "enfermagem.procedure": "fas fa-syringe",
    "enfermagem.procedurecatalog": "fas fa-th-list",
    "enfermagem.procedurecatalogmaterial": "fas fa-boxes",
    "enfermagem.procedureitem": "fas fa-list",
    "enfermagem.procedureitemvalue": "fas fa-tag",
    "enfermagem.procedurematerial": "fas fa-box",
    "enfermagem.procedurematerialvalue": "fas fa-tag",
    "farmacia.parentcategory": "fas fa-sitemap",
    "farmacia.productcategory": "fas fa-tags",
    "farmacia.product": "fas fa-pills",
    "farmacia.lot": "fas fa-barcode",
    "farmacia.inventorymovement": "fas fa-exchange-alt",
    "farmacia.sale": "fas fa-cash-register",
    "farmacia.saleitem": "fas fa-receipt",
    "farmacia.materialrequisition": "fas fa-clipboard-list",
    "farmacia.materialrequisitionitem": "fas fa-box-open",
    "warehouse.warehouse": "fas fa-warehouse",
    "warehouse.storagelocation": "fas fa-map-marker-alt",
    "warehouse.warehouseitemcategory": "fas fa-tags",
    "warehouse.warehouseitem": "fas fa-box",
    "warehouse.warehouselot": "fas fa-barcode",
    "warehouse.stocklevel": "fas fa-layer-group",
    "warehouse.stockmovement": "fas fa-exchange-alt",
    "warehouse.replenishmentplan": "fas fa-project-diagram",
    "warehouse.replenishmentsuggestion": "fas fa-lightbulb",
    "warehouse.salesorder": "fas fa-shopping-cart",
    "warehouse.salesorderline": "fas fa-list-ol",
    "warehouse.stockreservation": "fas fa-bookmark",
    "warehouse.picklist": "fas fa-clipboard-list",
    "warehouse.picklistline": "fas fa-tasks",
    "warehouse.shipment": "fas fa-shipping-fast",
    "warehouse.shipmentline": "fas fa-box-open",
    "warehouse.purchaseorder": "fas fa-file-invoice",
    "warehouse.purchaseorderline": "fas fa-list",
    "warehouse.goodsreceipt": "fas fa-dolly",
    "warehouse.goodsreceiptline": "fas fa-list-ul",
    "warehouse.stocktransfer": "fas fa-truck-loading",
    "warehouse.stocktransferline": "fas fa-route",
    "warehouse.cyclecount": "fas fa-clipboard-check",
    "warehouse.cyclecountline": "fas fa-tasks",
    "bloodbank.blooddonation": "fas fa-hand-holding-medical",
    "bloodbank.bloodunit": "fas fa-box-open",
    "bloodbank.bloodtransfusion": "fas fa-heartbeat",
    "bloodbank.bloodstorage": "fas fa-warehouse",
    "bloodbank.bloodstockmovement": "fas fa-exchange-alt",
    "bloodbank.bloodstoragemaintenance": "fas fa-tools",
    "faturamento.invoice": "fas fa-file-invoice-dollar",
    "faturamento.invoicehistory": "fas fa-history",
    "faturamento.invoiceitem": "fas fa-list-ul",
    "pagamentos.payment": "fas fa-money-bill-wave",
    "pagamentos.transaction": "fas fa-exchange-alt",
    "pagamentos.receipt": "fas fa-receipt",
    "pagamentos.reconciliation": "fas fa-balance-scale",
    "pagamentos.paymenthistory": "fas fa-history",
    "contabilidade.account": "fas fa-wallet",
    "contabilidade.accountbalance": "fas fa-chart-pie",
    "contabilidade.financialreconciliation": "fas fa-balance-scale",
    "contabilidade.legacyentry": "fas fa-pen-fancy",
    "contabilidade.legacymovement": "fas fa-arrows-alt-h",
    "contabilidade.ledgerentry": "fas fa-book",
    "entidades.company": "fas fa-industry",
    "seguradora.insurer": "fas fa-shield-alt",
    "seguradora.coverageplan": "fas fa-clipboard-list",
    "seguradora.tenantcoverageplan": "fas fa-link",
    "seguradora.procedureauthorization": "fas fa-stamp",
    "notificacoes.notification": "fas fa-paper-plane",
    "notificacoes.notificationtemplate": "fas fa-file-alt",
    "notificacoes.deliverylog": "fas fa-clipboard-check",
    "monitoramento.systemerror": "fas fa-bug",
    "monitoramento.transactionaloutboxevent": "fas fa-stream",
    "ai_assistant.aisession": "fas fa-comments",
    "ai_assistant.aimessage": "fas fa-comment-dots",
    "ai_assistant.aitoolcall": "fas fa-terminal",
    "ai_assistant.aisuggestedaction": "fas fa-magic",
    "ai_assistant.aioperationaltask": "fas fa-tasks",
    "ai_assistant.aiinvestigation": "fas fa-search",
    "ai_assistant.aiknowledgeentry": "fas fa-brain",
    "ai_assistant.aipolicyevent": "fas fa-shield-alt",
    "cirurgia.surgery": "fas fa-procedures",
    "cirurgia.smallsurgery": "fas fa-cut",
    "cirurgia.largesurgery": "fas fa-hospital",
    "cirurgia.surgicalprocedure": "fas fa-syringe",
    "cirurgia.surgicalschedule": "fas fa-calendar-check",
    "cirurgia.operatingroom": "fas fa-hospital",
    "cirurgia.surgicalteammember": "fas fa-users",
    "cirurgia.anesthesiarecord": "fas fa-lungs",
    "cirurgia.surgicalsafetychecklist": "fas fa-clipboard-check",
    "cirurgia.surgicalmaterial": "fas fa-toolbox",
    "cirurgia.surgicalconsumption": "fas fa-dolly",
    "cirurgia.recoveryrecord": "fas fa-heartbeat",
    "cirurgia.operativereport": "fas fa-file-medical-alt",
    "equipamentos.equipment": "fas fa-tools",
    "inspecoes.dailyinspection": "fas fa-clipboard-check",
    "manutencoes.maintenance": "fas fa-wrench",
    "ocorrencias.incident": "fas fa-exclamation-triangle",
    "integracoes_equipamentos.integrationequipment": "fas fa-microscope",
    "integracoes_equipamentos.integrationcredential": "fas fa-key",
    "integracoes_equipamentos.integrationdocument": "fas fa-file-alt",
    "integracoes_equipamentos.integrationanalytemapping": "fas fa-project-diagram",
    "integracoes_equipamentos.integrationmessage": "fas fa-envelope-open-text",
    "integracoes_equipamentos.integrationorder": "fas fa-tasks",
    "integracoes_equipamentos.integrationrouting": "fas fa-route",
    "auditoria_atividades.useractivity": "fas fa-user-clock",
    "recursos_humanos.employee": "fas fa-user-tie",
    "recursos_humanos.jobtitle": "fas fa-briefcase",
    "recursos_humanos.familydependent": "fas fa-user-friends",
    "recursos_humanos.absence": "fas fa-user-times",
    "recursos_humanos.vacation": "fas fa-umbrella-beach",
    "recursos_humanos.payroll": "fas fa-file-invoice",
    "recursos_humanos.termination": "fas fa-user-slash",
    "recursos_humanos.overtime": "fas fa-clock",
    "recursos_humanos.workschedule": "fas fa-calendar-alt",
    "recursos_humanos.disciplinaryprocess": "fas fa-gavel",
    "recursos_humanos.profession": "fas fa-user-md",
    "recepcao.receptioncheckin": "fas fa-clipboard-check",
    "telemedicina.telemedicinewaitingroomentry": "fas fa-video",
    "telemedicina.remotemonitoringdevice": "fas fa-heartbeat",
    "telemedicina.remotevitalreading": "fas fa-notes-medical",
    "telemedicina.storeandforwardcase": "fas fa-file-medical-alt",
    "telemedicina.chronicmonitoringprogram": "fas fa-clipboard-list",
    "telemedicina.remoteclinicalalert": "fas fa-bell",
    "saude_publica.vaccineproduct": "fas fa-syringe",
    "saude_publica.vaccinelot": "fas fa-boxes",
    "saude_publica.vaccinationcampaign": "fas fa-bullhorn",
    "saude_publica.vaccinationcampaigntarget": "fas fa-map-marked-alt",
    "saude_publica.immunizationrecord": "fas fa-clipboard-check",
    "saude_publica.adverseeventfollowingimmunization": "fas fa-exclamation-triangle",
    "saude_publica.publichealthnotification": "fas fa-paper-plane",
}

_jazzmin_icons = JAZZMIN_SETTINGS.setdefault("icons", {})
for _canonical_key, _legacy_key in _JAZZMIN_ICON_ALIASES.items():
    if _canonical_key not in _jazzmin_icons and _legacy_key in _jazzmin_icons:
        _jazzmin_icons[_canonical_key] = _jazzmin_icons[_legacy_key]

for _icon_key, _icon_value in _JAZZMIN_ICON_DEFAULTS.items():
    _jazzmin_icons.setdefault(_icon_key, _icon_value)

# ---------------------------------------------------------
# Compat: filtro legacy 'length_is' (Django 5 removeu)
# ---------------------------------------------------------
try:
    from django.template import defaultfilters as _defaultfilters

    if "length_is" not in _defaultfilters.register.filters:

        def _length_is(value, expected_length):
            try:
                return len(value) == int(expected_length)
            except Exception:
                return False

        _defaultfilters.register.filter("length_is", _length_is)
        _defaultfilters.length_is = _length_is
except Exception:
    # Se o import falhar (ex.: antes do setup completo), ignoramos silenciosamente.
    pass

JAZZMIN_UI_TWEAKS = {
    # Keep admin chrome stable while main/sidebar scroll independently.
    "navbar_fixed": True,
    "sidebar_fixed": True,
    "footer_fixed": True,
}

# =========================================================
# MIDDLEWARE
# =========================================================

ENABLE_TENANT_LIMIT_MIDDLEWARE = get_env("ENABLE_TENANT_LIMIT_MIDDLEWARE", "true").lower() in ("1", "true", "yes", "on")
ENABLE_TENANT_AUDIT_MIDDLEWARE = get_env("ENABLE_TENANT_AUDIT_MIDDLEWARE", "true").lower() in ("1", "true", "yes", "on")
ENABLE_LEGACY_USER_ACTIVITY_MIDDLEWARE = (
    get_env("ENABLE_LEGACY_USER_ACTIVITY_MIDDLEWARE", "false").lower() in ("1", "true", "yes", "on")
)
ENABLE_API_LOGGING_MIDDLEWARE = get_env("ENABLE_API_LOGGING_MIDDLEWARE", "true").lower() in ("1", "true", "yes", "on")
AUDIT_ACTIVITY_ASYNC = get_env_bool("AUDIT_ACTIVITY_ASYNC", True)
AUDIT_ACTIVITY_WORKERS = get_env_int("AUDIT_ACTIVITY_WORKERS", 1)

MIDDLEWARE = [
    *(["django_prometheus.middleware.PrometheusBeforeMiddleware"] if _module_available("django_prometheus") else []),
    "django.middleware.security.SecurityMiddleware",
    "infrastructure.middleware.trusted_host.TrustedHostMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.common.CommonMiddleware",
    "infrastructure.middleware.admin_path_alias.AdminPathAliasMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    # multi-tenant
    "infrastructure.middleware.tenant.TenantMiddleware",
    "infrastructure.middleware.tenant_enforcer.TenantEnforcerMiddleware",
    # captura de erros (persistência em BD para monitoramento)
    "infrastructure.middleware.errors.ErrorCaptureMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # request context
    "infrastructure.middleware.request_user.RequestUserMiddleware",
    # limites por tenant
    *(["infrastructure.middleware.limits.TenantLimitMiddleware"] if ENABLE_TENANT_LIMIT_MIDDLEWARE else []),
    # auditoria
    *(["infrastructure.middleware.audit.TenantAuditMiddleware"] if ENABLE_TENANT_AUDIT_MIDDLEWARE else []),
    # Middleware legado (duplicava persistência de atividade em BD).
    *(["infrastructure.middleware.user_activity.UserActivityMiddleware"] if ENABLE_LEGACY_USER_ACTIVITY_MIDDLEWARE else []),
    # logging
    *(["infrastructure.middleware.performance.APILoggingMiddleware"] if ENABLE_API_LOGGING_MIDDLEWARE else []),
    *(["django_prometheus.middleware.PrometheusAfterMiddleware"] if _module_available("django_prometheus") else []),
]

# =========================================================
# DATABASE
# =========================================================

DB_ENGINE = get_env("DB_ENGINE", "postgres")


def _sqlite_databases():
    return {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }


def _dev_weaker_password_hashers():
    # Mais rápido para dev/tests locais, não usar em produção.
    return [
        "django.contrib.auth.hashers.MD5PasswordHasher",
    ]


if DB_ENGINE == "sqlite":
    DATABASES = _sqlite_databases()
    PASSWORD_HASHERS = _dev_weaker_password_hashers()

else:
    # Postgres é o padrão em ambiente docker/k8s, mas em dev local o host pode
    # não existir (ex.: DB_HOST=db fora do docker). Nesse caso, cai para sqlite
    # para permitir `migrate/runserver` sem dependências externas.
    try:
        DATABASES = {
            "default": {
                "ENGINE": (
                    "django_prometheus.db.backends.postgresql"
                    if _module_available("django_prometheus")
                    else "django.db.backends.postgresql"
                ),
                # Prefer Replit-managed Postgres (PG* vars) when present; otherwise fall back to DB_* vars.
                "NAME": os.environ.get("PGDATABASE") or get_env("DB_NAME", required=True),
                "USER": os.environ.get("PGUSER") or get_env("DB_USER", required=True),
                "PASSWORD": os.environ.get("PGPASSWORD") or get_env("DB_PASSWORD", required=True),
                "HOST": os.environ.get("PGHOST") or get_env("DB_HOST", "localhost"),
                "PORT": os.environ.get("PGPORT") or get_env("DB_PORT", "5432"),
                "CONN_MAX_AGE": 300,
                "OPTIONS": {
                    "connect_timeout": 10,
                },
            }
        }
    except ImproperlyConfigured:
        if DEBUG:
            DB_ENGINE = "sqlite"
            DATABASES = _sqlite_databases()
            PASSWORD_HASHERS = _dev_weaker_password_hashers()
        else:
            raise
    else:
        if DEBUG:
            host = (DATABASES.get("default") or {}).get("HOST") or ""
            try:
                socket.getaddrinfo(host, None)
            except socket.gaierror:
                DB_ENGINE = "sqlite"
                DATABASES = _sqlite_databases()
                PASSWORD_HASHERS = _dev_weaker_password_hashers()

DATABASE_ROUTERS = ["infrastructure.database.TenantDatabaseRouter"]

# =========================================================
# CACHE (Redis opcional; fallback para banco de dados)
# =========================================================
#
# Em ambientes sem Redis (ex.: Replit), USE_REDIS=false faz o cache cair para
# uma tabela no banco (django.core.cache.backends.db). É partilhado entre
# workers do gunicorn, mas mais lento que Redis. Para reativar Redis, defina
# USE_REDIS=true e REDIS_URL.
USE_REDIS = get_env("USE_REDIS", "false").lower() in ("1", "true", "yes", "on")

if USE_REDIS:
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": REDIS_URL,
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
                "IGNORE_EXCEPTIONS": True,
            },
            "TIMEOUT": 300,
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.db.DatabaseCache",
            "LOCATION": "django_cache_table",
            "TIMEOUT": 300,
        }
    }

# =========================================================
# AUTH
# =========================================================

AUTH_USER_MODEL = "identidade.User"

# =========================================================
# SUPERUSER POLICY
# =========================================================
#
# Superuser ignora RBAC e pode atravessar tenants. Para reduzir riscos,
# restringimos superusers a uma allowlist explícita (normalmente vazia).
SUPERUSER_ALLOWLIST = [u.strip() for u in get_env("SUBSTRATO_SUPERUSER_ALLOWLIST", "").split(",") if u.strip()]

# =========================================================
# TEMPLATES
# =========================================================

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

# =========================================================
# STATIC / MEDIA
# =========================================================

STATIC_URL = "/static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# =========================================================
# INTERNATIONALIZATION
# =========================================================

LANGUAGE_CODE = "pt-br"
LANGUAGES = [
    ("pt-br", "Português (Brasil)"),
    ("pt", "Português (Portugal)"),
    ("en", "English"),
]
LOCALE_PATHS = [BASE_DIR / "locale"]
LANGUAGE_COOKIE_NAME = "django_language"
LANGUAGE_COOKIE_AGE = 60 * 60 * 24 * 365  # 1 ano
LANGUAGE_COOKIE_PATH = "/"
LANGUAGE_COOKIE_SAMESITE = "Lax"

TIME_ZONE = get_env("DJANGO_TIME_ZONE", "Africa/Maputo")

USE_I18N = True
USE_TZ = True

# =========================================================
# REST FRAMEWORK
# =========================================================

REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "security.authenticacao.JWTAuth",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "api.core.filter_backends.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_SCHEMA_CLASS": (
        "drf_spectacular.openapi.AutoSchema"
        if _module_available("drf_spectacular")
        else "rest_framework.schemas.openapi.AutoSchema"
    ),
    "EXCEPTION_HANDLER": "api.v1.exceptions.custom_exception_handler",
    # Habilita escopos de throttling; usamos para login.
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "login": "5/min",
    },
}

# =========================================================
# JWT
# =========================================================

SESSION_IDLE_TIMEOUT_MINUTES = get_env_int("SESSION_IDLE_TIMEOUT_MINUTES", 30)
SESSION_IDLE_TIMEOUT_SECONDS = max(5, SESSION_IDLE_TIMEOUT_MINUTES) * 60
SESSION_COOKIE_AGE = SESSION_IDLE_TIMEOUT_SECONDS
SESSION_SAVE_EVERY_REQUEST = True
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
AUTH_COOKIE_SESSION_ONLY = get_env_bool("AUTH_COOKIE_SESSION_ONLY", True)

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(seconds=SESSION_IDLE_TIMEOUT_SECONDS),
    "REFRESH_TOKEN_LIFETIME": timedelta(seconds=SESSION_IDLE_TIMEOUT_SECONDS),
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# =========================================================
# CORS
# =========================================================

CORS_ALLOW_ALL_ORIGINS = DEBUG

if not DEBUG:
    CORS_ALLOWED_ORIGINS = [
        origin.strip() for origin in get_env("CORS_ALLOWED_ORIGINS", "").split(",") if origin.strip()
    ]

# =========================================================
# CSRF
# =========================================================
#
# Necessário quando o backend (especialmente Django Admin) é acessado por outro
# origin via proxy/reverse-proxy (ex.: frontend em :3000 apontando para backend :8000).
CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in get_env("CSRF_TRUSTED_ORIGINS", "").split(",") if origin.strip()]

# =========================================================
# SECURITY
# =========================================================

SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"

SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG

SECURE_BROWSER_XSS_FILTER = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"

# =========================================================
# CELERY
# =========================================================

ASYNC_PROCESSING_ENABLED = get_env_bool("ASYNC_PROCESSING_ENABLED", True)

CELERY_BROKER_URL = get_env("CELERY_BROKER_URL", REDIS_URL)
CELERY_RESULT_BACKEND = get_env("CELERY_RESULT_BACKEND", CELERY_BROKER_URL)

# Celery 6+ mudança: broker_connection_retry não controla mais retries no startup.
# Definimos explicitamente para remover warning e manter comportamento previsível.
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
CELERY_BROKER_CONNECTION_TIMEOUT = float(get_env("CELERY_BROKER_CONNECTION_TIMEOUT_SECONDS", "3"))

CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"

CELERY_TIMEZONE = TIME_ZONE
CELERY_ENABLE_UTC = True

CELERY_TASK_DEFAULT_QUEUE = get_env("CELERY_TASK_DEFAULT_QUEUE", "default")
CELERY_TASK_DEFAULT_EXCHANGE = CELERY_TASK_DEFAULT_QUEUE
CELERY_TASK_DEFAULT_ROUTING_KEY = CELERY_TASK_DEFAULT_QUEUE
CELERY_WORKER_QUEUES = get_env_csv("CELERY_WORKER_QUEUES", "default,exports,billing,operations")
CELERY_TASK_CREATE_MISSING_QUEUES = True


def _celery_direct_queue(name: str) -> Queue:
    exchange = Exchange(name, type="direct")
    return Queue(name, exchange, routing_key=name)


CELERY_TASK_QUEUES = tuple(_celery_direct_queue(queue_name) for queue_name in CELERY_WORKER_QUEUES)
CELERY_TASK_ROUTES = {
    "tasks.export_jobs.run_export_job": {"queue": "exports", "routing_key": "exports"},
    "tasks.billing.recalculation.recalculate_invoice_task": {"queue": "billing", "routing_key": "billing"},
    "tasks.billing.recalculation.recalculate_invoices": {"queue": "billing", "routing_key": "billing"},
    "tasks.authorization_worker.process_authorization_task": {
        "queue": "operations",
        "routing_key": "operations",
    },
    "apps.tenants.tasks.run_subscription_billing_cycle": {
        "queue": "billing",
        "routing_key": "billing",
    },
}
CELERY_IMPORTS = ("tasks.tasks",)

# Cobrança recorrente de assinaturas (idempotente; pode correr de hora a hora).
CELERY_BEAT_SCHEDULE = {
    "subscription-billing-cycle": {
        "task": "apps.tenants.tasks.run_subscription_billing_cycle",
        "schedule": 60 * 60,  # segundos
        "options": {"queue": "billing", "routing_key": "billing"},
    },
}

# =====================================================================
# BILLING / ASSINATURAS (cobrança da plataforma ao tenant)
# =====================================================================
# Gateway ativo. "sandbox" (default) é determinístico e não faz rede — ideal
# para dev/teste. M-Pesa/eMola/Stripe plugam no mesmo registry com credenciais.
PAYMENT_GATEWAY = get_env("PAYMENT_GATEWAY", "sandbox")
# Em testes, força o resultado do sandbox: "succeed" | "fail" | "pending".
PAYMENT_SANDBOX_FORCE = get_env("PAYMENT_SANDBOX_FORCE", "")
# Dias de trial no signup self-service.
SUBSCRIPTION_TRIAL_DAYS = get_env_int("SUBSCRIPTION_TRIAL_DAYS", 14)
# Tentativas de cobrança falhadas seguidas antes de suspender o tenant (dunning).
SUBSCRIPTION_MAX_FAILED_CHARGES = get_env_int("SUBSCRIPTION_MAX_FAILED_CHARGES", 3)

# Execução previsível: tarefas longas não devem travar workers indefinidamente.
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = get_env_int("CELERY_TASK_TIME_LIMIT_SECONDS", 15 * 60)
CELERY_TASK_SOFT_TIME_LIMIT = get_env_int("CELERY_TASK_SOFT_TIME_LIMIT_SECONDS", 12 * 60)
CELERY_RESULT_EXPIRES = get_env_int("CELERY_RESULT_EXPIRES_SECONDS", 60 * 60)
CELERY_WORKER_PREFETCH_MULTIPLIER = get_env_int("CELERY_WORKER_PREFETCH_MULTIPLIER", 1)
CELERY_WORKER_MAX_TASKS_PER_CHILD = get_env_int("CELERY_WORKER_MAX_TASKS_PER_CHILD", 100)
CELERY_TASK_ACKS_LATE = get_env_bool("CELERY_TASK_ACKS_LATE", True)
CELERY_TASK_REJECT_ON_WORKER_LOST = get_env_bool("CELERY_TASK_REJECT_ON_WORKER_LOST", True)
CELERY_TASK_ALWAYS_EAGER = get_env_bool("CELERY_TASK_ALWAYS_EAGER", False)
CELERY_TASK_EAGER_PROPAGATES = get_env_bool("CELERY_TASK_EAGER_PROPAGATES", DEBUG)

# Eventos alimentam Flower/celery-exporter/Prometheus sem alterar o contrato das APIs.
CELERY_WORKER_SEND_TASK_EVENTS = get_env_bool("CELERY_WORKER_SEND_TASK_EVENTS", True)
CELERY_TASK_SEND_SENT_EVENT = get_env_bool("CELERY_TASK_SEND_SENT_EVENT", True)

CELERY_REDIS_VISIBILITY_TIMEOUT = get_env_int("CELERY_REDIS_VISIBILITY_TIMEOUT_SECONDS", 60 * 60)
CELERY_BROKER_TRANSPORT_OPTIONS = {
    "visibility_timeout": CELERY_REDIS_VISIBILITY_TIMEOUT,
    "socket_timeout": float(get_env("CELERY_REDIS_SOCKET_TIMEOUT_SECONDS", "5")),
    "socket_connect_timeout": float(get_env("CELERY_REDIS_CONNECT_TIMEOUT_SECONDS", "5")),
}
CELERY_RESULT_BACKEND_TRANSPORT_OPTIONS = {
    "retry_policy": {
        "timeout": float(get_env("CELERY_RESULT_BACKEND_RETRY_TIMEOUT_SECONDS", "5")),
    }
}

# =========================================================
# E-MAIL
# =========================================================

EMAIL_BACKEND = get_env(
    "EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend" if DEBUG else "django.core.mail.backends.smtp.EmailBackend",
)
EMAIL_HOST = get_env("EMAIL_HOST", "localhost")
EMAIL_PORT = int(get_env("EMAIL_PORT", "25"))
EMAIL_HOST_USER = get_env("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = get_env("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = get_env("EMAIL_USE_TLS", "False").lower() == "true"
EMAIL_USE_SSL = get_env("EMAIL_USE_SSL", "False").lower() == "true"
EMAIL_TIMEOUT = int(get_env("EMAIL_TIMEOUT", "10"))

# =========================================================
# NOTIFICAÇÕES
# =========================================================

DEFAULT_FROM_EMAIL = get_env("DEFAULT_FROM_EMAIL", "no-reply@substrato.local")

NOTIFICACOES_EMAIL_ATIVAS = get_env("NOTIFICACOES_EMAIL_ATIVAS", "True").lower() == "true"

NOTIFICACOES_SMS_ATIVAS = get_env("NOTIFICACOES_SMS_ATIVAS", "False").lower() == "true"

NOTIFICACOES_WHATSAPP_ATIVAS = get_env("NOTIFICACOES_WHATSAPP_ATIVAS", "False").lower() == "true"

SMS_API_URL = get_env("SMS_API_URL", "")
SMS_API_KEY = get_env("SMS_API_KEY", "")

WHATSAPP_API_URL = get_env("WHATSAPP_API_URL", "")
WHATSAPP_API_KEY = get_env("WHATSAPP_API_KEY", "")

# =========================================================
# PASSWORD RESET
# =========================================================
#
# TTL em minutos para tokens de reposição de palavra-passe (API /auth/password-reset/*).
PASSWORD_RESET_TOKEN_TTL_MINUTES = int(get_env("PASSWORD_RESET_TOKEN_TTL_MINUTES", "30"))

# =========================================================
# DEFAULT PRIMARY KEY
# =========================================================

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# =========================================================
# DRF-SPECTACULAR (OpenAPI)
# =========================================================

SPECTACULAR_SETTINGS = {
    "TITLE": "Substrato API",
    "DESCRIPTION": "API REST da Plataforma Substrato - Gestão Hospitalar e Laboratorial",
    "VERSION": "1.0.0",
    # Em produção, schema/docs ajudam bastante o atacante a mapear superfícies.
    # Em dev, manter público para facilitar testes locais.
    "SERVE_PERMISSIONS": (
        ["rest_framework.permissions.AllowAny"] if DEBUG else ["rest_framework.permissions.IsAdminUser"]
    ),
    "SERVE_AUTHENTICATION": None,
    "SWAGGER_UI_SETTINGS": {
        "deepLinking": True,
        "persistAuthorizationData": True,
        "displayOperationId": True,
    },
    "CONTACT": {
        "name": "Substrato Support",
        "email": "suporte@substrato.com",
    },
    "LICENSE": {
        "name": "MIT",
    },
    "TAGS_SORTER": "alpha",
    "OPERATION_SORTER": "alpha",
    "COMPONENT_SPLIT_REQUEST": True,
    "COMPONENT_NO_READ_ONLY_REQUIRED": True,
    "SECURITY_DEFINITIONS": {
        "Bearer": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    },
    "SECURITY": [{"Bearer": []}],
    "SCHEMA_COERCE_DECIMAL_STRINGS": False,
    "MULTI_USE_SERIALIZER_CLASSES": True,
    # Evita warnings de colisao de enums (mesmo nome de campo com choice-sets distintos).
    "ENUM_NAME_OVERRIDES": {
        "EstadoResultadoEnum": [
            ("pendente", "Pendente"),
            ("em_analise", "Em Análise"),
            ("aguardando_validacao", "Aguardando Validação"),
            ("validado", "Validado"),
            ("rejeitado", "Rejeitado"),
        ],
        "TipoResultadoEnum": "core.constants.laboratory.result_type.TipoResultado",
        "MetodoLaboratorioEnum": "core.constants.laboratory.method.Metodo",
        "MetodoPagamentoEnum": [
            ("DIN", "Dinheiro"),
            ("CAR", "Cartão"),
            ("TRF", "Transferência"),
            ("MOB", "Mobile Money"),
            ("POS", "POS"),
            ("CHQ", "Cheque"),
            ("OUT", "Outro"),
        ],
        "CheckinRecepcaoPrioridadeEnum": [
            ("URG", "Urgente"),
            ("PREF", "Preferencial"),
            ("NOR", "Normal"),
        ],
    },
    "SERVERS": [
        {
            "url": "/api/v1",
            "description": "Development",
        },
    ],
}
"""Configurações base do Django para todos os ambientes."""
