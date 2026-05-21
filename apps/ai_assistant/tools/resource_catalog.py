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
    "equipment_integrations": ("Integrações de equipamentos", "Equipment integrations"),
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
    "clinical-examfield": ("Campos de exame laboratorial", "Laboratory exam fields"),
    "clinical-medicalexam": ("Exames médicos", "Medical exams"),
    "clinical-medicalexamfield": ("Campos de exame médico", "Medical exam fields"),
    "clinical-medicalresultfile": ("Ficheiros de resultado médico", "Medical result files"),
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
    "insurer-insurer": ("Seguradoras", "Insurers"),
    "insurer-planocobertura": ("Planos de cobertura", "Coverage plans"),
    "insurer-tenantplanocobertura": ("Planos de cobertura por tenant", "Tenant coverage plans"),
    "insurer-autorizacaoprocedimento": ("Autorizações de procedimento", "Procedure authorizations"),
    "identity-user": ("Utilizadores", "Users"),
    "identity-perfilprofissional": ("Perfis profissionais", "Professional profiles"),
    "identity-passwordresettoken": ("Tokens de redefinição de palavra-passe", "Password reset tokens"),
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
    "equipment-equipment": ("Equipamentos", "Equipment"),
    "equipment-daily_inspection": ("Inspeções diárias", "Daily inspections"),
    "equipment-inspecaodiaria": ("Inspeções diárias", "Daily inspections"),
    "equipment-maintenance": ("Manutenções de equipamento", "Equipment maintenance"),
    "equipment-manutencao": ("Manutenções de equipamento", "Equipment maintenance"),
    "equipment-incident": ("Ocorrências de equipamento", "Equipment incidents"),
    "equipment-ocorrencia": ("Ocorrências de equipamento", "Equipment incidents"),
    "equipment_integrations-equipment": ("Equipamentos integrados", "Integrated equipment"),
    "equipment_integrations-credential": ("Credenciais de integração", "Integration credentials"),
    "equipment_integrations-routing": ("Roteamentos de integração", "Integration routing rules"),
    "equipment_integrations-order": ("Ordens de integração", "Integration orders"),
    "equipment_integrations-order_item": ("Itens de ordem de integração", "Integration order items"),
    "equipment_integrations-message": ("Mensagens de integração", "Integration messages"),
    "equipment_integrations-document": ("Documentos de integração", "Integration documents"),
    "equipment_integrations-analyte_mapping": ("Mapeamentos de analitos", "Analyte mappings"),
    "maternity-gestacao": ("Gestações", "Pregnancies"),
    "external_entities-empresa": ("Empresas e entidades externas", "Companies and external entities"),
    "education-student": ("Estudantes", "Students"),
    "education-teacher": ("Professores", "Teachers"),
    "education-course": ("Cursos", "Courses"),
    "education-classroom": ("Turmas", "Classrooms"),
    "education-enrollment": ("Matrículas", "Enrollments"),
    "education-attendance": ("Presenças", "Attendance"),
    "education-grade": ("Avaliações", "Grades"),
    "education-examination": ("Exames escolares", "Examinations"),
    "education-content": ("Conteúdos de aprendizagem", "Learning content"),
    "monitoring-error": ("Erros do sistema", "System errors"),
    "human_resources-role": ("Cargos", "Job titles"),
    "human_resources-profissao": ("Profissões", "Professions"),
    "human_resources-employee": ("Funcionários", "Employees"),
    "human_resources-processodisciplinar": ("Processos disciplinares", "Disciplinary processes"),
    "human_resources-agregadofamiliar": ("Agregados familiares", "Family dependents"),
    "human_resources-horario": ("Horários de trabalho", "Work schedules"),
    "human_resources-falta": ("Faltas", "Absences"),
    "human_resources-ferias": ("Férias", "Vacations"),
    "human_resources-dispensa": ("Dispensas", "Terminations"),
    "human_resources-horaextra": ("Horas extra", "Overtime"),
    "human_resources-folhapagamento": ("Folhas de pagamento", "Payroll"),
    "consultations-consultation": ("Consultas médicas", "Medical consultations"),
    "consultations-specialty": ("Especialidades de consulta", "Consultation specialties"),
    "consultations-holiday": ("Feriados de consulta", "Consultation holidays"),
    "consultations-doctors": ("Médicos", "Doctors"),
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
    "clinical-labrequest": (
        "requisicao",
        "requisição",
        "requisicoes",
        "requisições",
        "requisicao clinica",
        "requisição clínica",
        "requisicao laboratorial",
        "requisição laboratorial",
        "pedido clinico",
        "pedido clínico",
        "pedido laboratorial",
        "request",
        "requests",
        "clinical request",
        "laboratory request",
        "pedido",
        "pedidos",
    ),
    "clinical-labrequestitem": (
        "item de requisicao",
        "item de requisição",
        "itens de requisicao",
        "itens de requisição",
        "item de pedido",
        "item laboratorial",
        "request item",
        "request items",
        "laboratory request item",
    ),
    "clinical-resultitem": (
        "resultado",
        "resultados",
        "resultado laboratorial",
        "resultados laboratoriais",
        "laboratorio",
        "laboratório",
        "result",
        "results",
        "laboratory result",
        "laboratory results",
    ),
    "clinical-exam": (
        "exame",
        "exames",
        "exame laboratorial",
        "exames laboratoriais",
        "analise laboratorial",
        "análise laboratorial",
        "analises laboratoriais",
        "análises laboratoriais",
        "teste laboratorial",
        "laboratory exam",
        "laboratory exams",
        "lab exam",
        "lab exams",
        "exam",
        "exams",
    ),
    "clinical-examfield": (
        "campo de exame",
        "campos de exame",
        "campo de exame laboratorial",
        "campos de exame laboratorial",
        "parametro de exame",
        "parâmetro de exame",
        "parametro laboratorial",
        "parâmetro laboratorial",
        "laboratory exam field",
        "exam field",
        "exam fields",
    ),
    "clinical-medicalexam": (
        "exame medico",
        "exame médico",
        "exames medicos",
        "exames médicos",
        "exame de imagem",
        "exames de imagem",
        "medical exam",
        "medical exams",
        "imaging exam",
    ),
    "clinical-medicalexamfield": (
        "campo de exame medico",
        "campo de exame médico",
        "campos de exame medico",
        "campos de exame médico",
        "parametro de exame medico",
        "parâmetro de exame médico",
        "medical exam field",
        "medical exam fields",
    ),
    "clinical-medicalresultfile": (
        "ficheiro de resultado medico",
        "ficheiro de resultado médico",
        "ficheiros de resultado medico",
        "ficheiros de resultado médico",
        "arquivo de resultado medico",
        "arquivo de resultado médico",
        "laudo medico",
        "laudo médico",
        "relatorio medico",
        "relatório médico",
        "medical result file",
        "medical result files",
    ),
    "clinical-sample": (
        "amostra",
        "amostras",
        "amostra biologica",
        "amostra biológica",
        "tipo de amostra",
        "frasco",
        "tubo",
        "recipiente de coleta",
        "recipiente de colheita",
        "sample",
        "samples",
        "biological sample",
    ),
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
    "insurer-insurer": (
        "seguradora",
        "seguradoras",
        "crie seguradora",
        "criar seguradora",
        "nova seguradora",
        "altere seguradora",
        "alterar seguradora",
        "actualize seguradora",
        "atualize seguradora",
        "remova seguradora",
        "remover seguradora",
        "seguradora nome",
        "seguradora chamada",
        "seguro",
        "seguros",
        "companhia de seguros",
        "companhias de seguros",
        "insurer",
        "insurers",
        "create insurer",
        "new insurer",
        "update insurer",
        "delete insurer",
        "insurer name",
        "insurance",
        "insurance company",
        "insurance companies",
        "insurance carrier",
    ),
    "insurer-planocobertura": (
        "plano de cobertura",
        "planos de cobertura",
        "plano de seguro",
        "planos de seguro",
        "plano da seguradora",
        "planos da seguradora",
        "cobertura de seguro",
        "coverage plan",
        "coverage plans",
        "insurance plan",
        "insurance plans",
        "health plan",
        "policy plan",
    ),
    "insurer-tenantplanocobertura": (
        "plano por tenant",
        "planos por tenant",
        "plano de cobertura por tenant",
        "plano local de cobertura",
        "planos locais de cobertura",
        "override de cobertura",
        "sobrescrita de cobertura",
        "tenant coverage plan",
        "tenant coverage plans",
        "tenant plan",
        "coverage override",
        "local coverage plan",
    ),
    "insurer-autorizacaoprocedimento": (
        "autorizacao de procedimento",
        "autorização de procedimento",
        "autorizacoes de procedimento",
        "autorizações de procedimento",
        "autorizacao da seguradora",
        "autorização da seguradora",
        "pedido de autorizacao",
        "pedido de autorização",
        "autorizacao de seguro",
        "autorização de seguro",
        "procedure authorization",
        "procedure authorizations",
        "insurance authorization",
        "authorization request",
        "preauthorization",
        "pre-authorisation",
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
    "equipment-equipment": (
        "equipamento",
        "equipamentos",
        "dispositivo",
        "dispositivos",
        "maquina",
        "máquina",
        "maquinas",
        "máquinas",
        "equipment",
        "device",
        "devices",
        "machine",
        "machines",
    ),
    "equipment-daily_inspection": (
        "inspection",
        "inspections",
        "daily inspection",
        "daily inspections",
        "equipment inspection",
        "equipment inspections",
        "inspecao diaria",
        "inspeção diária",
        "inspecao",
        "inspeção",
        "inspecoes",
        "inspeções",
        "inspecoes diarias",
        "inspeções diárias",
        "inspecao de equipamento",
        "inspeção de equipamento",
        "inspecoes de equipamento",
        "inspeções de equipamento",
        "verificacao diaria",
        "verificação diária",
        "verificacoes diarias",
        "verificações diárias",
        "safety inspection",
        "maintenance inspection",
    ),
    "equipment-inspecaodiaria": (
        "inspection",
        "inspections",
        "inspecao diaria",
        "inspeção diária",
        "inspecao",
        "inspeção",
        "inspecoes diarias",
        "inspeções diárias",
        "daily inspection",
        "daily inspections",
        "equipment inspection",
    ),
    "equipment-maintenance": (
        "manutencao",
        "manutenção",
        "manutencoes",
        "manutenções",
        "manutencao de equipamento",
        "manutenção de equipamento",
        "manutencoes de equipamento",
        "manutenções de equipamento",
        "equipment maintenance",
        "maintenance",
    ),
    "equipment-manutencao": (
        "manutencao",
        "manutenção",
        "manutencao de equipamento",
        "manutenção de equipamento",
        "maintenance",
    ),
    "equipment-incident": (
        "ocorrencia",
        "ocorrência",
        "ocorrencias",
        "ocorrências",
        "incidente",
        "incidentes",
        "incidents",
        "avaria",
        "avarias",
        "falha de equipamento",
        "falhas de equipamento",
        "ocorrencia de equipamento",
        "ocorrência de equipamento",
        "equipment incident",
        "equipment incidents",
        "incident report",
        "incident reports",
        "incident",
        "breakdown",
        "breakdowns",
        "failure",
        "failures",
    ),
    "equipment-ocorrencia": (
        "ocorrencia",
        "ocorrência",
        "ocorrencias",
        "ocorrências",
        "incidente",
        "incidentes",
        "incidents",
        "avaria",
        "avarias",
        "falha de equipamento",
        "falhas de equipamento",
        "incident",
        "incident report",
        "equipment incident",
        "equipment incidents",
        "breakdown",
        "failure",
    ),
    "equipment_integrations-equipment": (
        "equipamento integrado",
        "equipamentos integrados",
        "equipamento de integracao",
        "equipamento de integração",
        "analisador integrado",
        "analisadores integrados",
        "maquina integrada",
        "máquina integrada",
        "device integration equipment",
        "integrated equipment",
        "integrated device",
    ),
    "equipment_integrations-credential": (
        "credencial de integracao",
        "credencial de integração",
        "credenciais de integracao",
        "credenciais de integração",
        "chave de integracao",
        "chave de integração",
        "api key do equipamento",
        "token do equipamento",
        "integration credential",
        "integration credentials",
        "equipment key",
    ),
    "equipment_integrations-routing": (
        "roteamento de integracao",
        "roteamento de integração",
        "roteamentos de integracao",
        "roteamentos de integração",
        "regra de roteamento",
        "regras de roteamento",
        "encaminhamento de equipamento",
        "integration routing",
        "routing rule",
        "routing rules",
    ),
    "equipment_integrations-order": (
        "ordem de integracao",
        "ordem de integração",
        "ordens de integracao",
        "ordens de integração",
        "worklist",
        "ordem worklist",
        "pedido para equipamento",
        "integration order",
        "integration orders",
        "equipment order",
    ),
    "equipment_integrations-order_item": (
        "item de ordem de integracao",
        "item de ordem de integração",
        "itens de ordem de integracao",
        "itens de ordem de integração",
        "item de worklist",
        "item worklist",
        "integration order item",
        "integration order items",
        "worklist item",
    ),
    "equipment_integrations-message": (
        "mensagem de integracao",
        "mensagem de integração",
        "mensagens de integracao",
        "mensagens de integração",
        "mensagem do equipamento",
        "payload de equipamento",
        "inbox de equipamento",
        "integration message",
        "integration messages",
        "equipment message",
    ),
    "equipment_integrations-document": (
        "documento de integracao",
        "documento de integração",
        "documentos de integracao",
        "documentos de integração",
        "ficheiro de integracao",
        "ficheiro de integração",
        "arquivo de integracao",
        "arquivo de integração",
        "integration document",
        "integration documents",
        "equipment document",
    ),
    "equipment_integrations-analyte_mapping": (
        "mapeamento de analito",
        "mapeamentos de analitos",
        "mapa de analito",
        "codigo de analito",
        "código de analito",
        "codigo do analisador",
        "código do analisador",
        "campo mapeado",
        "analyte mapping",
        "analyte mappings",
        "analyzer code",
    ),
    "maternity-gestacao": (
        "gestacao",
        "gestação",
        "gestacoes",
        "gestações",
        "gravidez",
        "gravida",
        "grávida",
        "gestante",
        "gestantes",
        "pre natal",
        "pré natal",
        "pre-natal",
        "pré-natal",
        "maternidade",
        "pregnancy",
        "pregnancies",
        "maternity",
        "prenatal",
        "antenatal",
    ),
    "external_entities-empresa": (
        "empresa",
        "empresas",
        "entidade",
        "entidades",
        "entidade externa",
        "entidades externas",
        "empresa externa",
        "empresas externas",
        "empregador",
        "empregadores",
        "parceiro",
        "parceiros",
        "cliente corporativo",
        "clientes corporativos",
        "company",
        "companies",
        "external entity",
        "external entities",
        "corporate client",
        "employer",
        "partner",
    ),
    "identity-user": (
        "utilizador",
        "utilizadores",
        "usuario",
        "usuário",
        "usuarios",
        "usuários",
        "conta de utilizador",
        "contas de utilizador",
        "conta de usuario",
        "contas de usuario",
        "login",
        "acesso",
        "user",
        "users",
        "user account",
        "user accounts",
        "identity user",
    ),
    "identity-perfilprofissional": (
        "perfil profissional",
        "perfis profissionais",
        "perfil de profissional",
        "perfil do utilizador",
        "perfil do usuario",
        "vinculo profissional",
        "vínculo profissional",
        "cedula profissional",
        "cédula profissional",
        "registo profissional",
        "registro profissional",
        "professional profile",
        "professional profiles",
        "staff profile",
    ),
    "identity-passwordresettoken": (
        "token de reset",
        "tokens de reset",
        "token de redefinicao",
        "token de redefinição",
        "token de palavra passe",
        "token de palavra-passe",
        "redefinicao de senha",
        "redefinição de senha",
        "redefinicao de palavra passe",
        "redefinição de palavra-passe",
        "password reset token",
        "password reset tokens",
        "reset token",
    ),
    "education-student": (
        "estudante",
        "estudantes",
        "aluno",
        "alunos",
        "perfil de estudante",
        "student",
        "students",
        "student profile",
    ),
    "education-teacher": (
        "professor",
        "professores",
        "docente",
        "docentes",
        "perfil de professor",
        "teacher",
        "teachers",
        "teacher profile",
    ),
    "education-course": (
        "curso",
        "cursos",
        "disciplina",
        "disciplinas",
        "plano curricular",
        "course",
        "courses",
    ),
    "education-classroom": (
        "turma",
        "turmas",
        "sala",
        "salas",
        "classe",
        "classes",
        "classroom",
        "classrooms",
        "class",
        "classes",
    ),
    "education-enrollment": (
        "matricula",
        "matrícula",
        "matriculas",
        "matrículas",
        "inscricao",
        "inscrição",
        "inscricoes",
        "inscrições",
        "enrollment",
        "enrollments",
    ),
    "education-attendance": (
        "presenca",
        "presença",
        "presencas",
        "presenças",
        "chamada",
        "assiduidade",
        "falta",
        "faltas",
        "attendance",
        "attendance record",
    ),
    "education-grade": (
        "nota",
        "notas",
        "avaliacao",
        "avaliação",
        "avaliacoes",
        "avaliações",
        "pontuacao",
        "pontuação",
        "grade",
        "grades",
        "grade record",
    ),
    "education-examination": (
        "exame escolar",
        "exames escolares",
        "prova",
        "provas",
        "teste",
        "testes",
        "examination",
        "examinations",
        "exam",
        "exams",
    ),
    "education-content": (
        "conteudo",
        "conteúdo",
        "conteudos",
        "conteúdos",
        "conteudo de aprendizagem",
        "conteúdo de aprendizagem",
        "material",
        "materiais",
        "aula",
        "licao",
        "lição",
        "learning content",
        "content",
        "lesson",
        "document",
    ),
    "monitoring-error": ("erro", "erros", "falha", "falhas", "5xx", "4xx", "system error", "server error"),
    "human_resources-role": (
        "cargo",
        "cargos",
        "funcao",
        "função",
        "funcoes",
        "funções",
        "posto",
        "postos",
        "job title",
        "job titles",
        "role",
        "roles",
    ),
    "human_resources-profissao": (
        "profissao",
        "profissão",
        "profissoes",
        "profissões",
        "categoria profissional",
        "carreira",
        "salario base por profissao",
        "salário base por profissão",
        "profession",
        "professions",
        "professional category",
    ),
    "human_resources-employee": (
        "funcionario",
        "funcionário",
        "funcionarios",
        "funcionários",
        "colaborador",
        "colaboradores",
        "trabalhador",
        "trabalhadores",
        "empregado",
        "empregados",
        "employee",
        "employees",
        "staff",
        "worker",
        "workers",
    ),
    "human_resources-processodisciplinar": (
        "processo disciplinar",
        "processos disciplinares",
        "disciplina",
        "penalizacao",
        "penalização",
        "sancao",
        "sanção",
        "disciplinary process",
        "disciplinary processes",
        "disciplinary case",
    ),
    "human_resources-agregadofamiliar": (
        "agregado familiar",
        "agregados familiares",
        "dependente",
        "dependentes",
        "familiar",
        "familiares",
        "family dependent",
        "family dependents",
        "dependent",
        "dependents",
    ),
    "human_resources-horario": (
        "horario",
        "horário",
        "horarios",
        "horários",
        "horario de trabalho",
        "horário de trabalho",
        "escala",
        "turno",
        "work schedule",
        "work schedules",
        "shift",
        "shifts",
    ),
    "human_resources-falta": (
        "falta",
        "faltas",
        "ausencia",
        "ausência",
        "ausencias",
        "ausências",
        "falta laboral",
        "absence",
        "absences",
    ),
    "human_resources-ferias": (
        "ferias",
        "férias",
        "ferias do funcionario",
        "férias do funcionário",
        "vacation",
        "vacations",
        "leave",
    ),
    "human_resources-dispensa": (
        "dispensa",
        "dispensas",
        "desligamento",
        "desligamentos",
        "demissao",
        "demissão",
        "rescisao",
        "rescisão",
        "termination",
        "terminations",
        "dismissal",
    ),
    "human_resources-horaextra": (
        "hora extra",
        "horas extra",
        "horas extras",
        "trabalho extra",
        "overtime",
        "overtimes",
        "extra hours",
    ),
    "human_resources-folhapagamento": (
        "folha de pagamento",
        "folhas de pagamento",
        "folha salarial",
        "folhas salariais",
        "salario",
        "salário",
        "salario liquido",
        "salário líquido",
        "salario base",
        "salário base",
        "payroll",
        "payrolls",
        "salary",
        "payslip",
    ),
    "consultations-consultation": (
        "consulta",
        "consultas",
        "consulta medica",
        "consulta médica",
        "consultas medicas",
        "consultas médicas",
        "marcacao",
        "marcação",
        "marcacoes",
        "marcações",
        "agenda",
        "agendamento",
        "appointment",
        "appointments",
        "medical consultation",
        "medical consultations",
    ),
    "consultations-specialty": (
        "especialidade",
        "especialidades",
        "especialidade de consulta",
        "especialidades de consulta",
        "tipo de consulta",
        "tipos de consulta",
        "servico de consulta",
        "serviço de consulta",
        "servicos de consulta",
        "serviços de consulta",
        "consultation specialty",
        "consultation specialties",
        "specialty",
        "specialties",
    ),
    "consultations-holiday": (
        "feriado",
        "feriados",
        "feriado de consulta",
        "feriados de consulta",
        "calendario de feriados",
        "calendário de feriados",
        "holiday",
        "holidays",
        "consultation holiday",
        "consultation holidays",
    ),
    "consultations-doctors": (
        "medico",
        "médico",
        "medicos",
        "médicos",
        "doutor",
        "doutores",
        "profissional medico",
        "profissional médico",
        "doctor",
        "doctors",
        "physician",
        "physicians",
    ),
}

MODULE_ALIASES: dict[str, tuple[str, ...]] = {
    "clinical": ("clinico", "clínico", "clinical", "laboratorio", "laboratório"),
    "nursing": ("enfermagem", "nursing"),
    "pharmacy": ("farmacia", "farmácia", "pharmacy", "stock", "estoque"),
    "billing": ("faturamento", "facturacao", "billing"),
    "bloodbank": ("banco de sangue", "hemoterapia", "sangue", "blood bank", "bloodbank"),
    "payments": ("pagamentos", "payments"),
    "insurer": (
        "seguradora",
        "seguradoras",
        "seguro",
        "seguros",
        "insurance",
        "insurer",
        "cobertura",
        "coverage",
        "autorizacao",
        "autorização",
    ),
    "education": ("educacao", "educação", "education", "escola"),
    "equipment": (
        "equipamento",
        "equipamentos",
        "equipment",
        "sge",
    ),
    "monitoring": ("monitoramento", "monitorizacao", "monitorização", "monitoring", "erros"),
    "audit": ("auditoria", "audit"),
    "human_resources": ("recursos humanos", "rh", "human resources"),
    "consultations": ("consultas", "consultations"),
    "maternity": (
        "maternidade",
        "gestacao",
        "gestação",
        "gestacoes",
        "gestações",
        "gravidez",
        "gestante",
        "maternity",
        "pregnancy",
        "pregnancies",
    ),
    "identity": (
        "identidade",
        "identity",
        "utilizadores",
        "usuarios",
        "usuários",
        "contas",
        "acessos",
        "perfis profissionais",
    ),
    "equipment_integrations": (
        "integracoes de equipamentos",
        "integrações de equipamentos",
        "integracao de equipamentos",
        "integração de equipamentos",
        "integracao de analisadores",
        "integração de analisadores",
        "equipment integrations",
        "device integrations",
        "analyzer integrations",
    ),
    "external_entities": (
        "entidades externas",
        "entidade externa",
        "empresas externas",
        "empregadores",
        "parceiros",
        "external entities",
        "companies",
        "corporate clients",
    ),
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
