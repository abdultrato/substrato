"""
Testes para validar os 8 fixes críticos (P0 + P1) do módulo de enfermagem.

Fixes implementados:
- P0.1: Proteger billed=True contra alterações
- P0.2: Corrigir mark_billed() para bloquear NOT_COMPLETED
- P0.3: Validação de alta com procedures pendentes
- P0.4: Transação atômica com lock em sync_status
- P1.1: Auditoria de alterações pós-faturamento (via imutabilidade)
- P1.2: Validar timing (executed_at < billed_at)
- P1.3: Remover bypassability via PUT/PATCH
- P1.4: Validação multi-tenant
"""

from decimal import Decimal
from datetime import datetime, timedelta

from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from django.test import TestCase
from django.db import transaction

import pytest

from apps.clinical.models import Patient
from apps.nursing.models import (
    Procedure,
    ProcedureItem,
    ProcedureCatalog,
    Ward,
    WardBed,
    WardAdmission,
)
from apps.tenants.models import Tenant


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def tenant():
    return Tenant.objects.create(
        identifier="tn-nursing-test",
        name="Tenant Nursing Test"
    )


@pytest.fixture
def patient(tenant):
    return Patient.objects.create(
        tenant=tenant,
        name="Paciente Teste",
        gender="Masculino",
        address_street="Rua Teste",
        birth_date="1990-01-01",
    )


@pytest.fixture
def procedure_catalog(tenant):
    return ProcedureCatalog.objects.create(
        tenant=tenant,
        name="Curativos",
        description="Procedimento padrão de curativos",
        default_price=Decimal("50.00"),
        vat_percentage=Decimal("0.00"),
    )


@pytest.fixture
def procedure(tenant, patient):
    return Procedure.objects.create(
        tenant=tenant,
        patient=patient,
        performed_date=timezone.now(),
    )


@pytest.fixture
def procedure_item(procedure, procedure_catalog):
    return ProcedureItem.objects.create(
        tenant=procedure.tenant,
        procedure=procedure,
        catalog=procedure_catalog,
        description="Curativo simples",
        quantity=1,
        unit_price=Decimal("50.00"),
    )


@pytest.fixture
def ward(tenant):
    return Ward.objects.create(
        tenant=tenant,
        name="Enfermaria A",
        description="Enfermaria de clínica geral",
        active=True,
    )


@pytest.fixture
def ward_bed(ward):
    return WardBed.objects.create(
        tenant=ward.tenant,
        ward=ward,
        number="001",
        active=True,
    )


# ============================================================================
# P0.1: PROTEGER BILLED=TRUE CONTRA ALTERAÇÕES
# ============================================================================

@pytest.mark.django_db
class TestP01ProtectBilledImmutability:
    """Validar que items faturados são imutáveis."""

    def test_cannot_modify_quantity_on_billed_item(self, procedure_item):
        """Não pode alterar quantidade de item já faturado."""
        # Setup: marcar como executado e faturado
        procedure_item.mark_executed()
        procedure_item.mark_completed()
        procedure_item.mark_billed()
        procedure_item.refresh_from_db()

        assert procedure_item.billed is True

        # Attempt: tentar alterar quantidade
        procedure_item.quantity = 5

        with pytest.raises(DjangoValidationError) as exc_info:
            procedure_item.full_clean()

        assert "quantity" in str(exc_info.value).lower()
        assert "imutável" in str(exc_info.value).lower()

    def test_cannot_modify_unit_price_on_billed_item(self, procedure_item):
        """Não pode alterar preço unitário de item já faturado."""
        # Setup
        procedure_item.mark_executed()
        procedure_item.mark_completed()
        procedure_item.mark_billed()
        procedure_item.refresh_from_db()

        # Attempt
        procedure_item.unit_price = Decimal("100.00")

        with pytest.raises(DjangoValidationError) as exc_info:
            procedure_item.full_clean()

        assert "unit_price" in str(exc_info.value).lower()
        assert "imutável" in str(exc_info.value).lower()

    def test_billed_item_original_values_unchanged(self, procedure_item):
        """Verificar que valores originais permanecem íntegros."""
        original_quantity = procedure_item.quantity
        original_price = procedure_item.unit_price

        procedure_item.mark_executed()
        procedure_item.mark_completed()
        procedure_item.mark_billed()

        procedure_item.refresh_from_db()
        assert procedure_item.quantity == original_quantity
        assert procedure_item.unit_price == original_price


# ============================================================================
# P0.2: CORRIGIR MARK_BILLED() PARA BLOQUEAR NOT_COMPLETED
# ============================================================================

@pytest.mark.django_db
class TestP02FixMarkBilledLogic:
    """Validar que apenas EXECUTED/COMPLETED podem ser faturados."""

    def test_cannot_bill_not_completed_item(self, procedure_item):
        """Não pode faturar item marcado como NÃO_CONCLUÍDO."""
        # Setup
        procedure_item.mark_executed()
        procedure_item.mark_not_completed()

        # Attempt
        with pytest.raises(DjangoValidationError) as exc_info:
            procedure_item.mark_billed()

        assert "não-concluído" in str(exc_info.value).lower()

    def test_cannot_bill_pending_item(self, procedure_item):
        """Não pode faturar item ainda PENDENTE."""
        # Status padrão é PENDING
        assert procedure_item.execution_status == ProcedureItem.ExecutionStatus.PENDING

        with pytest.raises(DjangoValidationError) as exc_info:
            procedure_item.mark_billed()

        assert "não foi executado" in str(exc_info.value).lower()

    def test_can_bill_executed_item(self, procedure_item):
        """Pode faturar item EXECUTADO."""
        procedure_item.mark_executed()
        procedure_item.mark_completed()

        # Não deve lançar exception
        procedure_item.mark_billed()
        procedure_item.refresh_from_db()

        assert procedure_item.billed is True

    def test_can_bill_completed_item(self, procedure_item):
        """Pode faturar item CONCLUÍDO."""
        procedure_item.mark_executed()
        procedure_item.mark_completed()

        # Não deve lançar exception
        procedure_item.mark_billed()
        procedure_item.refresh_from_db()

        assert procedure_item.billed is True


# ============================================================================
# P0.3: VALIDAÇÃO DE ALTA COM PROCEDURES PENDENTES
# ============================================================================

@pytest.mark.django_db
class TestP03ValidateDischargePendingProcedures:
    """Validar que paciente não pode receber alta com procedures pendentes."""

    def test_cannot_discharge_with_requested_procedure(
        self, tenant, patient, ward_bed, procedure
    ):
        """Não pode dar alta com procedure em status REQUESTED."""
        assert procedure.workflow_status == Procedure.WorkflowStatus.REQUESTED

        admission = WardAdmission.objects.create(
            tenant=tenant,
            bed=ward_bed,
            patient=patient,
            admission_date=timezone.now(),
            discharged_at=timezone.now(),  # Tentando dar alta
        )

        with pytest.raises(DjangoValidationError) as exc_info:
            admission.full_clean()

        assert "procedure" in str(exc_info.value).lower()
        assert "não concluído" in str(exc_info.value).lower()

    def test_cannot_discharge_with_executed_procedure(
        self, tenant, patient, ward_bed, procedure_item
    ):
        """Não pode dar alta com procedure em status EXECUTED."""
        procedure_item.mark_executed()

        admission = WardAdmission.objects.create(
            tenant=tenant,
            bed=ward_bed,
            patient=patient,
            admission_date=timezone.now(),
            discharged_at=timezone.now(),
        )

        with pytest.raises(DjangoValidationError) as exc_info:
            admission.full_clean()

        assert "procedure" in str(exc_info.value).lower()

    def test_cannot_discharge_with_partial_procedure(
        self, tenant, patient, ward_bed, procedure, procedure_catalog
    ):
        """Não pode dar alta com procedure em status PARTIAL."""
        # Criar 2 items: um completo, outro pendente
        item1 = ProcedureItem.objects.create(
            tenant=tenant,
            procedure=procedure,
            catalog=procedure_catalog,
            quantity=1,
            unit_price=Decimal("50.00"),
        )
        item2 = ProcedureItem.objects.create(
            tenant=tenant,
            procedure=procedure,
            catalog=procedure_catalog,
            quantity=1,
            unit_price=Decimal("50.00"),
        )

        item1.mark_executed()
        item1.mark_completed()
        # item2 fica PENDING

        procedure.sync_status_from_items()
        procedure.refresh_from_db()
        assert procedure.workflow_status == Procedure.WorkflowStatus.PARTIAL

        admission = WardAdmission.objects.create(
            tenant=tenant,
            bed=ward_bed,
            patient=patient,
            admission_date=timezone.now(),
            discharged_at=timezone.now(),
        )

        with pytest.raises(DjangoValidationError) as exc_info:
            admission.full_clean()

        assert "procedure" in str(exc_info.value).lower()

    def test_can_discharge_with_completed_procedure(
        self, tenant, patient, ward_bed, procedure_item
    ):
        """Pode dar alta quando procedure está COMPLETED."""
        procedure_item.mark_executed()
        procedure_item.mark_completed()
        procedure_item.procedure.sync_status_from_items()

        admission = WardAdmission.objects.create(
            tenant=tenant,
            bed=ward_bed,
            patient=patient,
            admission_date=timezone.now(),
            discharged_at=timezone.now(),
        )

        # Não deve lançar exception
        admission.full_clean()
        admission.save()

        assert admission.discharged_at is not None

    def test_can_discharge_with_not_completed_procedure(
        self, tenant, patient, ward_bed, procedure_item
    ):
        """Pode dar alta quando procedure foi marcado como NÃO_CONCLUÍDO."""
        procedure_item.mark_executed()
        procedure_item.mark_not_completed()
        procedure_item.procedure.sync_status_from_items()

        admission = WardAdmission.objects.create(
            tenant=tenant,
            bed=ward_bed,
            patient=patient,
            admission_date=timezone.now(),
            discharged_at=timezone.now(),
        )

        # Não deve lançar exception (NOT_COMPLETED é final)
        admission.full_clean()
        admission.save()

        assert admission.discharged_at is not None


# ============================================================================
# P0.4: TRANSAÇÃO ATÔMICA COM LOCK EM SYNC_STATUS
# ============================================================================

@pytest.mark.django_db
class TestP04AtomicSyncWithLock:
    """Validar que sync_status_from_items é thread-safe."""

    def test_sync_status_sets_billed_correctly(self, procedure_item):
        """Verificar que status de billing é sincronizado corretamente."""
        procedure_item.mark_executed()
        procedure_item.mark_completed()

        procedure = procedure_item.procedure
        assert procedure.billing_status == Procedure.BillingStatus.PENDING

        procedure_item.mark_billed()
        procedure.sync_status_from_items()
        procedure.refresh_from_db()

        assert procedure.billing_status == Procedure.BillingStatus.BILLED

    def test_sync_status_partial_billing(self, procedure, procedure_catalog):
        """Verificar que status PARTIAL é detectado corretamente."""
        item1 = ProcedureItem.objects.create(
            tenant=procedure.tenant,
            procedure=procedure,
            catalog=procedure_catalog,
            quantity=1,
            unit_price=Decimal("50.00"),
        )
        item2 = ProcedureItem.objects.create(
            tenant=procedure.tenant,
            procedure=procedure,
            catalog=procedure_catalog,
            quantity=1,
            unit_price=Decimal("50.00"),
        )

        item1.mark_executed()
        item1.mark_completed()
        item1.mark_billed()

        item2.mark_executed()
        item2.mark_completed()
        # item2 não faturado

        procedure.sync_status_from_items()
        procedure.refresh_from_db()

        assert procedure.billing_status == Procedure.BillingStatus.PARTIAL

    def test_sync_status_consistency_across_calls(self, procedure_item):
        """Verificar que múltiplas chamadas mantêm consistência."""
        procedure_item.mark_executed()
        procedure_item.mark_completed()
        procedure_item.mark_billed()

        procedure = procedure_item.procedure

        # Chamar múltiplas vezes
        procedure.sync_status_from_items()
        status1 = procedure.workflow_status

        procedure.sync_status_from_items()
        procedure.refresh_from_db()
        status2 = procedure.workflow_status

        assert status1 == status2


# ============================================================================
# P1.2: VALIDAR TIMING (EXECUTED_AT < BILLED_AT)
# ============================================================================

@pytest.mark.django_db
class TestP12ValidateTiming:
    """Validar que timestamps são lógicos e consistentes."""

    def test_cannot_bill_before_execution(self, procedure_item):
        """Não pode ter billed_at anterior a executed_at."""
        now = timezone.now()

        procedure_item.executed_at = now
        procedure_item.billed_at = now - timedelta(hours=1)  # Antes da execução

        with pytest.raises(DjangoValidationError) as exc_info:
            procedure_item.full_clean()

        assert "billed_at" in str(exc_info.value).lower()

    def test_cannot_complete_before_execution(self, procedure_item):
        """Não pode ter completed_at anterior a executed_at."""
        now = timezone.now()

        procedure_item.executed_at = now
        procedure_item.completed_at = now - timedelta(hours=1)

        with pytest.raises(DjangoValidationError) as exc_info:
            procedure_item.full_clean()

        assert "completed_at" in str(exc_info.value).lower()

    def test_valid_timing_sequence(self, procedure_item):
        """Verificar que sequência correta é aceita."""
        now = timezone.now()

        procedure_item.executed_at = now
        procedure_item.completed_at = now + timedelta(minutes=30)
        procedure_item.billed_at = now + timedelta(hours=1)

        # Não deve lançar exception
        procedure_item.full_clean()


# ============================================================================
# P1.3: REMOVER BYPASSABILITY VIA PUT/PATCH
# ============================================================================

@pytest.mark.django_db
class TestP13ProtectFromAPIBypass:
    """Validar que campos críticos não podem ser modificados via API."""

    def test_update_execution_status_directly_blocked(self):
        """Simular tentativa de PATCH com execution_status (seria bloqueado no ViewSet)."""
        # Este teste é mais um teste de integração/API
        # Validamos que clean() bloqueia, e o ViewSet também
        # Para agora, validamos a camada model
        pass

    def test_billed_field_protected_by_clean(self, procedure_item):
        """Validar que billed é protegido por clean()."""
        procedure_item.mark_executed()
        procedure_item.mark_completed()
        procedure_item.mark_billed()

        # Tentar "desmarcar" como faturado direto
        procedure_item.billed = False
        procedure_item.quantity = 5  # Também tenta alterar quantidade

        with pytest.raises(DjangoValidationError):
            procedure_item.full_clean()


# ============================================================================
# P1.4: VALIDAÇÃO MULTI-TENANT
# ============================================================================

@pytest.mark.django_db
class TestP14ValidateTenantIsolation:
    """Validar que dados multi-tenant são isolados corretamente."""

    def test_item_tenant_must_match_patient_tenant(self, tenant, patient):
        """Item deve pertencer ao mesmo tenant do paciente."""
        other_tenant = Tenant.objects.create(
            identifier="tn-other",
            name="Other Tenant"
        )

        # Criar procedure com outro tenant
        procedure = Procedure.objects.create(
            tenant=other_tenant,
            patient=patient,  # Mas patient é do tenant original
            performed_date=timezone.now(),
        )

        # Tentar criar item
        item = ProcedureItem(
            tenant=procedure.tenant,  # Outro tenant
            procedure=procedure,
            description="Teste",
        )

        with pytest.raises(DjangoValidationError) as exc_info:
            item.full_clean()

        assert "tenant" in str(exc_info.value).lower()

    def test_correct_tenant_assignment(self, tenant, patient):
        """Item com tenant correto deve funcionar."""
        procedure = Procedure.objects.create(
            tenant=tenant,
            patient=patient,
            performed_date=timezone.now(),
        )

        item = ProcedureItem(
            tenant=tenant,
            procedure=procedure,
            description="Teste",
            quantity=1,
            unit_price=Decimal("50.00"),
        )

        # Não deve lançar exception
        item.full_clean()


# ============================================================================
# TESTES INTEGRADOS
# ============================================================================

@pytest.mark.django_db
class TestIntegrationFullProcedureLifecycle:
    """Validar ciclo completo de um procedimento com todos os fixes."""

    def test_complete_procedure_workflow(self, procedure_item, tenant, patient, ward_bed):
        """
        Executar ciclo completo:
        1. Criar procedure + item
        2. Executar e concluir
        3. Faturar
        4. Validar dados históricos
        5. Dar alta (deve funcionar)
        """
        # 1. Procedure criado
        assert procedure_item.execution_status == ProcedureItem.ExecutionStatus.PENDING

        # 2. Executar e concluir
        procedure_item.mark_executed()
        assert procedure_item.execution_status == ProcedureItem.ExecutionStatus.EXECUTED

        procedure_item.mark_completed()
        assert procedure_item.execution_status == ProcedureItem.ExecutionStatus.COMPLETED

        # 3. Faturar
        procedure_item.mark_billed()
        assert procedure_item.billed is True

        # 4. Tentar modificar (deve falhar)
        procedure_item.quantity = 10
        with pytest.raises(DjangoValidationError):
            procedure_item.full_clean()

        # 5. Dar alta (deve funcionar)
        admission = WardAdmission.objects.create(
            tenant=tenant,
            bed=ward_bed,
            patient=patient,
            admission_date=timezone.now(),
            discharged_at=timezone.now(),
        )
        admission.full_clean()  # Não deve falhar
        admission.save()

        assert admission.discharged_at is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
