from datetime import timedelta
from importlib.util import find_spec
import os
from pathlib import Path
import socket

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

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


def get_env(name, default=None, required=False):
    value = os.getenv(name, default)

    if required and value is None:
        raise ImproperlyConfigured(f"{name} is required")

    return value


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
# PROMETHEUS (django-prometheus)
# =========================================================
#
# Se definido, exige `Authorization: Bearer <token>` no endpoint /metrics.
PROMETHEUS_BEARER_TOKEN = get_env("PROMETHEUS_BEARER_TOKEN", "")

# =========================================================
# APPLICATIONS
# =========================================================

DJANGO_APPS = [
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
    "django_countries",
    "rest_framework",
    "rest_framework_simplejwt",
    "django_filters",
    "corsheaders",
    *(["drf_spectacular"] if _module_available("drf_spectacular") else []),
]

LOCAL_APPS = [
    "apps.identity.apps.IdentityConfig",
    "apps.insurer.apps.InsurerConfig",
    "apps.external_entities.apps.ExternalEntitiesConfig",
    "apps.clinical.apps.ClinicalConfig",
    "apps.nursing.apps.NursingConfig",
    "apps.equipment_integrations.apps.EquipmentIntegrationsConfig",
    "apps.equipment.apps.EquipmentConfig",
    "apps.inspections.apps.InspectionsConfig",
    "apps.maintenance.apps.MaintenanceConfig",
    "apps.incidents.apps.IncidentsConfig",
    "apps.billing.apps.BillingConfig",
    "apps.payments.apps.PaymentsConfig",
    "apps.notifications.apps.NotificationsConfig",
    "apps.tenants.apps.TenantsConfig",
    "apps.pharmacy.apps.PharmacyConfig",
    "apps.bloodbank.apps.BloodBankConfig",
    "apps.accounting.apps.AccountingConfig",
    "apps.reception.apps.ReceptionConfig",
    "apps.audit_activities.apps.AuditActivitiesConfig",
    "apps.consultations.apps.ConsultationsConfig",
    "apps.medical_records.apps.MedicalRecordsConfig",
    "apps.maternity.apps.MaternityConfig",
    "apps.surgery.apps.SurgeryConfig",
    "apps.human_resources.apps.HumanResourcesConfig",
    "apps.monitoring.apps.MonitoringConfig",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# =========================================================
# JAZZMIN (tema do Django Admin)
# =========================================================
#
# Precisa vir ANTES de `django.contrib.admin` para sobrescrever templates/static.
INSTALLED_APPS = ["jazzmin", *INSTALLED_APPS]

JAZZMIN_SETTINGS = {
    "site_title": "Substrato Admin",
    "site_header": "Substrato",
    "site_brand": "Substrato",
    "site_logo": "img/logo.png",
    "site_logo_classes": "img-circle elevation-3 p-1 bg-white",
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
        "prontuario": "fas fa-notes-medical",
        "prontuario.registroprontuario": "fas fa-book-medical",
        "prontuario.prescricaoitem": "fas fa-pills",
        "consultas": "fas fa-stethoscope",
        "consultas.consultamedica": "fas fa-calendar-check",
        "consultas.especialidadeconsulta": "fas fa-sitemap",
        "consultas.feriado": "fas fa-calendar-day",
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
    },
    # Ordena apps e models no menu lateral do Admin (Jazzmin).
    # Prioriza fluxo operacional: Recepção -> Laboratório -> Enfermagem -> Farmácia.
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
        "prontuario",
        "prontuario.registroprontuario",
        "prontuario.prescricaoitem",
        "maternidade",
        "maternidade.gestacao",
        "cirurgia",
        "cirurgia.procedimentocirurgico",
        "cirurgia.cirurgia",
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
    # Clinical
    "clinical.patient": "clinico.paciente",
    "clinical.labexam": "clinico.exame",
    "clinical.labexamfield": "clinico.examecampo",
    "clinical.medicalexam": "clinico.examemedico",
    "clinical.labrequest": "clinico.requisicaoanalise",
    "clinical.result": "clinico.resultado",
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
    "enfermagem.nursingrecord": "enfermagem.registroenfermagem",
    "enfermagem.nursingvitalsign": "enfermagem.sinalvitalenfermagem",
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
    "seguradora.procedureauthorization": "seguradora.autorizacaoprocedimento",
    # Notifications
    "notificacoes.notification": "notificacoes.notificacao",
    "notificacoes.notificationtemplate": "notificacoes.templatenotificacao",
    "notificacoes.deliverylog": "notificacoes.logenvio",
    # Monitoring
    "monitoramento.systemerror": "monitoramento.errosistema",
    # Surgery
    "cirurgia.surgery": "cirurgia.cirurgia",
    "cirurgia.surgicalprocedure": "cirurgia.procedimentocirurgico",
    # Equipment related apps
    "inspecoes.dailyinspection": "equipamentos.inspecaodiaria",
    "manutencoes.maintenance": "equipamentos.manutencao",
    # Audit activities
    "auditoria_atividades.useractivity": "audit_activities.atividadeusuario",
}

_JAZZMIN_ICON_DEFAULTS = {
    # App-level (dashboard/sidebar groups)
    "clinical": "fas fa-hospital-user",
    "identidade": "fas fa-user-shield",
    "inquilinos": "fas fa-city",
    "consultas": "fas fa-stethoscope",
    "prontuario": "fas fa-notes-medical",
    "maternidade": "fas fa-baby",
    "enfermagem": "fas fa-user-nurse",
    "farmacia": "fas fa-prescription-bottle-alt",
    "bloodbank": "fas fa-tint",
    "faturamento": "fas fa-file-invoice-dollar",
    "contabilidade": "fas fa-calculator",
    "entidades": "fas fa-building",
    "seguradora": "fas fa-shield-alt",
    "notificacoes": "fas fa-bell",
    "monitoramento": "fas fa-heartbeat",
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
    "clinical.result": "fas fa-notes-medical",
    "clinical.sample": "fas fa-vials",
    "identidade.user": "fas fa-user",
    "inquilinos.tenant": "fas fa-city",
    "inquilinos.tenantconfiguration": "fas fa-cogs",
    "consultas.medicalconsultation": "fas fa-calendar-check",
    "consultas.consultationspecialty": "fas fa-sitemap",
    "consultas.holiday": "fas fa-calendar-day",
    "prontuario.medicalrecordentry": "fas fa-book-medical",
    "prontuario.prescriptionitem": "fas fa-pills",
    "maternidade.pregnancy": "fas fa-baby",
    "enfermagem.nursingrecord": "fas fa-notes-medical",
    "enfermagem.nursingvitalsign": "fas fa-heartbeat",
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
    "bloodbank.blooddonation": "fas fa-hand-holding-medical",
    "bloodbank.bloodunit": "fas fa-box-open",
    "bloodbank.bloodtransfusion": "fas fa-heartbeat",
    "bloodbank.bloodstorage": "fas fa-warehouse",
    "bloodbank.bloodstockmovement": "fas fa-exchange-alt",
    "bloodbank.bloodstoragemaintenance": "fas fa-tools",
    "faturamento.invoice": "fas fa-file-invoice-dollar",
    "contabilidade.account": "fas fa-wallet",
    "contabilidade.accountbalance": "fas fa-chart-pie",
    "contabilidade.financialreconciliation": "fas fa-balance-scale",
    "contabilidade.legacyentry": "fas fa-pen-fancy",
    "contabilidade.legacymovement": "fas fa-arrows-alt-h",
    "contabilidade.ledgerentry": "fas fa-book",
    "entidades.company": "fas fa-industry",
    "seguradora.insurer": "fas fa-shield-alt",
    "seguradora.coverageplan": "fas fa-clipboard-list",
    "seguradora.procedureauthorization": "fas fa-stamp",
    "notificacoes.notification": "fas fa-paper-plane",
    "notificacoes.notificationtemplate": "fas fa-file-alt",
    "notificacoes.deliverylog": "fas fa-clipboard-check",
    "monitoramento.systemerror": "fas fa-bug",
    "cirurgia.surgery": "fas fa-procedures",
    "cirurgia.surgicalprocedure": "fas fa-syringe",
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
    # Keep the footer always visible (requested by product).
    "footer_fixed": True,
}

# =========================================================
# MIDDLEWARE
# =========================================================

MIDDLEWARE = [
    *(["django_prometheus.middleware.PrometheusBeforeMiddleware"] if _module_available("django_prometheus") else []),
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "infrastructure.middleware.admin_path_alias.AdminPathAliasMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    # multi-tenant
    "infrastructure.middleware.tenant.TenantMiddleware",
    # captura de erros (persistência em BD para monitoramento)
    "infrastructure.middleware.errors.ErrorCaptureMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # request context
    "infrastructure.middleware.request_user.RequestUserMiddleware",
    # limites por tenant
    "infrastructure.middleware.limits.TenantLimitMiddleware",
    # auditoria
    "infrastructure.middleware.audit.TenantAuditMiddleware",
    "infrastructure.middleware.user_activity.UserActivityMiddleware",
    # logging
    "infrastructure.middleware.performance.APILoggingMiddleware",
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
            "TEST": {
                "SERIALIZE": False,
            },
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

SESSION_IDLE_TIMEOUT_MINUTES = int(get_env("SESSION_IDLE_TIMEOUT_MINUTES", "30"))

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(minutes=30),
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

SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG

SECURE_BROWSER_XSS_FILTER = True

# =========================================================
# CELERY
# =========================================================

CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL

# Celery 6+ mudança: broker_connection_retry não controla mais retries no startup.
# Definimos explicitamente para remover warning e manter comportamento previsível.
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True

CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"

CELERY_TIMEZONE = TIME_ZONE

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
