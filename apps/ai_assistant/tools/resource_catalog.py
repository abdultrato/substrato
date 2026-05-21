from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from functools import lru_cache
from types import SimpleNamespace
from typing import Any

from django.core.exceptions import FieldDoesNotExist
from django.db.models import Model, QuerySet

from api.v1.routing.routes import VIEWSET_GROUPS
from apps.ai_assistant.services.policy import AiPolicyGuard, normalize_group
from security.permissions.rbac import ROLE_POLICY, SAFE_METHODS


def normalize_text(value: str) -> str:
    value = (value or "").strip().lower()
    value = unicodedata.normalize("NFD", value)
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    return re.sub(r"\s+", " ", value)


MODULE_LABELS: dict[str, tuple[str, str]] = {
    "audit": ("Auditoria", "Audit"),
    "dashboard": ("Dashboard", "Dashboard"),
    "clinical": ("Clínico", "Clinical"),
    "consultations": ("Consultas", "Consultations"),
    "accounting": ("Contabilidade", "Accounting"),
    "nursing": ("Enfermagem", "Nursing"),
    "equipment": ("Equipamentos", "Equipment"),
    "external_entities": ("Entidades externas", "External entities"),
    "pharmacy": ("Farmácia", "Pharmacy"),
    "billing": ("Faturamento", "Billing"),
    "bloodbank": ("Banco de Sangue", "Blood bank"),
    "identity": ("Identidade", "Identity"),
    "tenants": ("Inquilinos", "Tenants"),
    "notifications": ("Notificações", "Notifications"),
    "payments": ("Pagamentos", "Payments"),
    "reception": ("Recepção", "Reception"),
    "insurer": ("Seguradora", "Insurance"),
    "medical_records": ("Prontuário", "Medical records"),
    "maternity": ("Maternidade", "Maternity"),
    "surgery": ("Cirurgia", "Surgery"),
    "human_resources": ("Recursos Humanos", "Human resources"),
    "monitoring": ("Monitoramento", "Monitoring"),
    "education": ("Educação", "Education"),
}

RESOURCE_LABELS: dict[str, tuple[str, str]] = {
    "audit-atividade": ("Actividades de utilizador", "User activity"),
    "audit-usuarios": ("Utilizadores", "Users"),
    "clinical-patient": ("Pacientes", "Patients"),
    "clinical-labrequest": ("Requisições clínicas", "Clinical requests"),
    "clinical-labrequestitem": ("Itens de requisição", "Request items"),
    "clinical-resultitem": ("Resultados laboratoriais", "Laboratory results"),
    "clinical-exam": ("Exames laboratoriais", "Laboratory exams"),
    "clinical-sample": ("Amostras", "Samples"),
    "billing-invoice": ("Faturas", "Invoices"),
    "billing-invoiceitem": ("Itens de fatura", "Invoice items"),
    "billing-invoicehistory": ("Históricos de fatura", "Invoice history"),
    "bloodbank-doacao": ("Doações de sangue", "Blood donations"),
    "bloodbank-armazenamento": ("Armazenamentos de sangue", "Blood storage"),
    "bloodbank-unidade": ("Unidades de sangue", "Blood units"),
    "bloodbank-transfusao": ("Transfusões de sangue", "Blood transfusions"),
    "bloodbank-movimentoestoque": ("Movimentações de stock de sangue", "Blood stock movements"),
    "bloodbank-manutencaoarmazenamento": ("Manutenções de armazenamento", "Storage maintenance"),
    "payments-payment": ("Pagamentos", "Payments"),
    "payments-receipt": ("Recibos", "Receipts"),
    "pharmacy-product": ("Produtos de farmácia", "Pharmacy products"),
    "pharmacy-lot": ("Lotes de farmácia", "Pharmacy lots"),
    "pharmacy-requisicaomaterial": ("Requisições de material", "Material requests"),
    "accounting-account": ("Contas contabilísticas", "Accounting accounts"),
    "accounting-entry": ("Lançamentos contabilísticos", "Accounting entries"),
    "accounting-movement": ("Movimentos contabilísticos", "Accounting movements"),
    "accounting-financialreconciliation": ("Conciliações financeiras", "Financial reconciliations"),
    "nursing-procedure": ("Procedimentos de enfermagem", "Nursing procedures"),
    "nursing-internamentoenfermaria": ("Internamentos", "Admissions"),
    "nursing-registroenfermagem": ("Registos de enfermagem", "Nursing records"),
    "education-student": ("Estudantes", "Students"),
    "education-teacher": ("Professores", "Teachers"),
    "education-enrollment": ("Matrículas", "Enrollments"),
    "education-attendance": ("Presenças", "Attendance"),
    "education-grade": ("Avaliações", "Grades"),
    "monitoring-error": ("Erros do sistema", "System errors"),
    "human_resources-employee": ("Funcionários", "Employees"),
    "human_resources-folhapagamento": ("Folhas de pagamento", "Payroll"),
    "consultations-consultation": ("Consultas médicas", "Medical consultations"),
}

RESOURCE_ALIASES: dict[str, tuple[str, ...]] = {
    "audit-atividade": (
        "atividade",
        "actividade",
        "atividade de auditoria",
        "actividade de auditoria",
        "atividade do utilizador",
        "actividade do utilizador",
        "historico",
        "histórico",
        "logs",
        "log",
        "auditoria",
        "audit activity",
        "user activity",
        "admin activity",
    ),
    "clinical-patient": ("paciente", "pacientes", "patient", "patients", "utente", "utentes"),
    "clinical-labrequest": ("requisicao", "requisição", "requisicoes", "requisições", "request", "requests", "pedido", "pedidos"),
    "clinical-resultitem": ("resultado", "resultados", "laboratorio", "laboratório", "result", "results"),
    "clinical-exam": ("exame", "exames", "exam", "exams"),
    "clinical-sample": ("amostra", "amostras", "sample", "samples"),
    "billing-invoice": (
        "fatura",
        "faturas",
        "factura",
        "facturas",
        "cobranca",
        "cobrança",
        "faturamento",
        "facturacao",
        "facturação",
        "invoice",
        "invoices",
    ),
    "billing-invoiceitem": (
        "item de fatura",
        "itens de fatura",
        "linha de fatura",
        "linhas de fatura",
        "item de factura",
        "itens de factura",
        "linha de factura",
        "linhas de factura",
        "item faturado",
        "itens faturados",
        "item facturado",
        "itens facturados",
        "invoice item",
        "invoice items",
        "billing item",
        "billing items",
    ),
    "billing-invoicehistory": (
        "historico de fatura",
        "histórico de fatura",
        "historicos de fatura",
        "históricos de fatura",
        "historico de factura",
        "histórico de factura",
        "historicos de factura",
        "históricos de factura",
        "evento de fatura",
        "evento de factura",
        "invoice history",
        "billing history",
    ),
    "bloodbank-doacao": (
        "doacao",
        "doação",
        "doacoes",
        "doações",
        "doacao de sangue",
        "doação de sangue",
        "doacoes de sangue",
        "doações de sangue",
        "doador",
        "dadores",
        "bolsa de sangue",
        "blood donation",
        "blood donations",
        "donation",
        "donations",
    ),
    "bloodbank-armazenamento": (
        "armazenamento",
        "armazenamentos",
        "armazenamento de sangue",
        "banco de sangue",
        "frigorifico",
        "frigorífico",
        "geleira",
        "blood storage",
        "storage",
    ),
    "bloodbank-unidade": (
        "unidade",
        "unidades",
        "unidade de sangue",
        "unidades de sangue",
        "hemocomponente",
        "hemocomponentes",
        "bolsa armazenada",
        "stock de sangue",
        "estoque de sangue",
        "blood unit",
        "blood units",
    ),
    "bloodbank-transfusao": (
        "transfusao",
        "transfusão",
        "transfusoes",
        "transfusões",
        "transfusao de sangue",
        "transfusão de sangue",
        "blood transfusion",
        "blood transfusions",
        "transfusion",
    ),
    "bloodbank-movimentoestoque": (
        "movimento de stock",
        "movimentos de stock",
        "movimento de estoque",
        "movimentos de estoque",
        "movimentacao de sangue",
        "movimentação de sangue",
        "stock de sangue",
        "estoque de sangue",
        "blood stock movement",
        "blood stock movements",
    ),
    "bloodbank-manutencaoarmazenamento": (
        "manutencao de armazenamento",
        "manutenção de armazenamento",
        "manutencoes de armazenamento",
        "manutenções de armazenamento",
        "manutencao do banco de sangue",
        "manutenção do banco de sangue",
        "calibracao",
        "calibração",
        "storage maintenance",
        "blood storage maintenance",
    ),
    "payments-payment": ("pagamento", "pagamentos", "payment", "payments"),
    "payments-receipt": ("recibo", "recibos", "receipt", "receipts"),
    "pharmacy-product": ("produto", "produtos", "medicamento", "medicamentos", "product", "products"),
    "pharmacy-lot": ("lote", "lotes", "stock", "estoque", "validade", "lot", "lots"),
    "pharmacy-requisicaomaterial": ("material", "materiais", "almoxarifado", "requisição de material", "material request"),
    "accounting-account": ("conta", "contas", "conta contabil", "conta contábil", "conta contabilistica", "plano de contas", "account", "accounts"),
    "accounting-entry": ("lancamento", "lançamento", "lancamentos", "lançamentos", "lancamento contabil", "lançamento contábil", "entrada contabil", "entry", "entries"),
    "accounting-movement": ("movimento", "movimentos", "movimento contabil", "movimento contábil", "debito", "débito", "credito", "crédito", "movement", "movements"),
    "accounting-financialreconciliation": ("conciliacao", "conciliação", "conciliacao financeira", "conciliação financeira", "reconciliacao", "reconciliation", "financial reconciliation"),
    "nursing-procedure": ("procedimento", "procedimentos", "enfermagem", "nursing"),
    "nursing-internamentoenfermaria": ("internamento", "internamentos", "cama", "camas", "admission", "ward"),
    "education-student": ("estudante", "estudantes", "aluno", "alunos", "student", "students"),
    "education-teacher": ("professor", "professores", "teacher", "teachers"),
    "education-enrollment": ("matricula", "matrícula", "matriculas", "matrículas", "enrollment", "enrollments"),
    "education-attendance": ("presenca", "presença", "presencas", "presenças", "attendance"),
    "education-grade": ("nota", "notas", "avaliacao", "avaliação", "grade", "grades"),
    "monitoring-error": ("erro", "erros", "falha", "falhas", "5xx", "4xx", "system error", "server error"),
    "human_resources-employee": ("funcionario", "funcionário", "funcionarios", "funcionários", "employee", "employees"),
    "consultations-consultation": ("consulta", "consultas", "agenda", "appointment", "appointments"),
}

MODULE_ALIASES: dict[str, tuple[str, ...]] = {
    "clinical": ("clinico", "clínico", "clinical", "laboratorio", "laboratório"),
    "nursing": ("enfermagem", "nursing"),
    "pharmacy": ("farmacia", "farmácia", "pharmacy", "stock", "estoque"),
    "billing": ("faturamento", "facturacao", "billing"),
    "bloodbank": ("banco de sangue", "hemoterapia", "sangue", "blood bank", "bloodbank"),
    "payments": ("pagamentos", "payments"),
    "education": ("educacao", "educação", "education", "escola"),
    "monitoring": ("monitoramento", "monitorizacao", "monitorização", "monitoring", "erros"),
    "audit": ("auditoria", "audit"),
    "human_resources": ("recursos humanos", "rh", "human resources"),
    "consultations": ("consultas", "consultations"),
}


@dataclass(frozen=True, slots=True)
class ResourceDescriptor:
    prefix: str
    route_name: str
    basename: str
    model_label: str
    app_label: str
    model_name: str
    label_pt: str
    label_en: str
    module_label_pt: str
    module_label_en: str
    href: str
    keywords: tuple[str, ...]

    def label(self, language: str = "pt") -> str:
        return self.label_en if language == "en" else self.label_pt

    def as_catalog_item(self, *, language: str = "pt") -> dict[str, Any]:
        return {
            "basename": self.basename,
            "label": self.label(language),
            "label_pt": self.label_pt,
            "label_en": self.label_en,
            "module": self.prefix,
            "module_label": self.module_label_en if language == "en" else self.module_label_pt,
            "module_label_pt": self.module_label_pt,
            "module_label_en": self.module_label_en,
            "model": self.model_label,
            "href": self.href,
        }


def _field_exists(model: type[Model], field_name: str) -> bool:
    try:
        model._meta.get_field(field_name)
        return True
    except FieldDoesNotExist:
        return False


def _model_for_viewset(viewset) -> type[Model] | None:
    queryset = getattr(viewset, "queryset", None)
    model = getattr(queryset, "model", None)
    if model is not None:
        return model

    serializer_class = getattr(viewset, "serializer_class", None)
    serializer_meta = getattr(serializer_class, "Meta", None) if serializer_class else None
    return getattr(serializer_meta, "model", None)


def _labels_for(prefix: str, route_name: str, basename: str, model: type[Model]) -> tuple[str, str, str, str]:
    module_pt, module_en = MODULE_LABELS.get(prefix, (prefix.replace("_", " ").title(), prefix.replace("_", " ").title()))
    label_pt, label_en = RESOURCE_LABELS.get(
        basename,
        (str(model._meta.verbose_name_plural).title(), str(model._meta.verbose_name_plural).title()),
    )
    if not label_pt:
        label_pt = route_name.replace("_", " ").title()
    if not label_en:
        label_en = label_pt
    return label_pt, label_en, module_pt, module_en


def _keywords_for(descriptor_seed: dict[str, str], model: type[Model], labels: tuple[str, str, str, str]) -> tuple[str, ...]:
    prefix = descriptor_seed["prefix"]
    route_name = descriptor_seed["route_name"]
    basename = descriptor_seed["basename"]
    label_pt, label_en, module_pt, module_en = labels
    base_terms = {
        prefix,
        route_name,
        basename,
        basename.replace("-", " "),
        model.__name__,
        model._meta.model_name,
        model._meta.label,
        model._meta.label_lower,
        str(model._meta.verbose_name),
        str(model._meta.verbose_name_plural),
        label_pt,
        label_en,
        module_pt,
        module_en,
        *RESOURCE_ALIASES.get(basename, ()),
        *MODULE_ALIASES.get(prefix, ()),
    }
    return tuple(sorted({normalize_text(term) for term in base_terms if normalize_text(term)}))


@lru_cache(maxsize=1)
def get_resource_descriptors() -> tuple[ResourceDescriptor, ...]:
    descriptors: list[ResourceDescriptor] = []
    for prefix, viewsets in VIEWSET_GROUPS.items():
        for route_name, viewset in sorted(viewsets.items()):
            model = _model_for_viewset(viewset)
            if model is None:
                continue
            basename = f"{prefix}-{route_name}"
            labels = _labels_for(prefix, route_name, basename, model)
            seed = {"prefix": prefix, "route_name": route_name, "basename": basename}
            descriptors.append(
                ResourceDescriptor(
                    prefix=prefix,
                    route_name=route_name,
                    basename=basename,
                    model_label=model._meta.label,
                    app_label=model._meta.app_label,
                    model_name=model.__name__,
                    label_pt=labels[0],
                    label_en=labels[1],
                    module_label_pt=labels[2],
                    module_label_en=labels[3],
                    href=f"/api/v1/{prefix}/{route_name}/",
                    keywords=_keywords_for(seed, model, labels),
                )
            )
    return tuple(descriptors)


def descriptor_by_basename(basename: str) -> ResourceDescriptor | None:
    normalized = (basename or "").strip()
    if not normalized:
        return None
    return next((descriptor for descriptor in get_resource_descriptors() if descriptor.basename == normalized), None)


def viewset_for_descriptor(descriptor: ResourceDescriptor):
    return (VIEWSET_GROUPS.get(descriptor.prefix) or {}).get(descriptor.route_name)


def match_resource_descriptors(message: str, *, limit: int = 8) -> list[ResourceDescriptor]:
    normalized = normalize_text(message)
    if not normalized:
        return []

    scored: list[tuple[int, ResourceDescriptor]] = []
    for descriptor in get_resource_descriptors():
        score = 0
        for keyword in descriptor.keywords:
            if not keyword or not _keyword_matches(keyword=keyword, normalized=normalized):
                continue
            score += 10 if " " in keyword else 4
        if score:
            scored.append((score, descriptor))

    scored.sort(key=lambda item: (-item[0], item[1].label_pt, item[1].basename))
    best_score = scored[0][0] if scored else 0
    threshold = max(4, best_score - 6)
    return [descriptor for score, descriptor in scored if score >= threshold][:limit]


def _keyword_matches(*, keyword: str, normalized: str) -> bool:
    # Avoid false positives such as "conta" matching "contacto".
    return bool(re.search(rf"(?<!\w){re.escape(keyword)}(?!\w)", normalized))


def user_can_method_resource(*, user, basename: str, method: str) -> bool:
    method = (method or "").strip().upper()
    if not method:
        return False

    policy = AiPolicyGuard()
    if policy.is_admin_like(user):
        return True

    user_groups = policy.normalized_user_groups(user)
    for group in user_groups:
        methods_by_resource = ROLE_POLICY.get(normalize_group(group)) or {}
        methods = methods_by_resource.get(basename)
        if methods and method in methods:
            return True
    return False


def user_can_read_resource(*, user, basename: str) -> bool:
    for method in SAFE_METHODS:
        if user_can_method_resource(user=user, basename=basename, method=method):
            return True
    return False


def accessible_resources_for_user(user) -> list[ResourceDescriptor]:
    return [descriptor for descriptor in get_resource_descriptors() if user_can_read_resource(user=user, basename=descriptor.basename)]


def scoped_queryset_for_resource(*, descriptor: ResourceDescriptor, tenant, user=None) -> QuerySet:
    from django.apps import apps as django_apps

    model = django_apps.get_model(descriptor.app_label, descriptor.model_name)
    queryset = _queryset_from_viewset(descriptor=descriptor, tenant=tenant, user=user)
    if queryset is None:
        queryset = model._default_manager.all()
    if tenant is not None and _field_exists(model, "tenant"):
        queryset = queryset.filter(tenant=tenant)
    if _field_exists(model, "deleted"):
        queryset = queryset.filter(deleted=False)
    return queryset


def _queryset_from_viewset(*, descriptor: ResourceDescriptor, tenant, user=None) -> QuerySet | None:
    viewset_class = (VIEWSET_GROUPS.get(descriptor.prefix) or {}).get(descriptor.route_name)
    if viewset_class is None:
        return None
    try:
        viewset = viewset_class()
        viewset.request = SimpleNamespace(user=user, tenant=tenant, query_params={}, method="GET")
        viewset.action = "list"
        viewset.kwargs = {}
        queryset = viewset.get_queryset()
        return queryset if isinstance(queryset, QuerySet) else None
    except Exception:
        return None


def descriptors_by_module(resources: list[ResourceDescriptor]) -> list[dict[str, Any]]:
    modules: dict[str, dict[str, Any]] = {}
    for descriptor in resources:
        current = modules.setdefault(
            descriptor.prefix,
            {
                "module": descriptor.prefix,
                "label_pt": descriptor.module_label_pt,
                "label_en": descriptor.module_label_en,
                "resources": [],
                "resource_count": 0,
            },
        )
        current["resources"].append(
            {
                "basename": descriptor.basename,
                "label_pt": descriptor.label_pt,
                "label_en": descriptor.label_en,
                "href": descriptor.href,
            }
        )
        current["resource_count"] += 1
    return sorted(modules.values(), key=lambda item: (item["label_pt"], item["module"]))
