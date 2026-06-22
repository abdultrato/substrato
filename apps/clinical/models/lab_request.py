"""Requisição de exames laboratoriais ou exames médicos."""


from django.conf import settings
from django.core.exceptions import FieldError, ValidationError
from django.db import IntegrityError, models, transaction

from core.constants.laboratory.clinical_status import ClinicalStatus
from core.models.base import NoNameCoreModel
from domain.clinical.result_state import ResultState
from domain.clinical.result_state_machine import ResultStateMachine

from .lab_exam import LabExam
from .patient import Patient
from .sample import Sample

User = settings.AUTH_USER_MODEL


class LabRequest(NoNameCoreModel):
    """Cabeçalho de uma solicitação de exames."""

    prefix = "REQ"  # Prefixo para IDs amigáveis

    class Type(models.TextChoices):
        LABORATORY = "LAB", "Laboratório"
        MEDICAL_EXAM = "MED", "Exame médico"

    class Tipo:
        # Compatibilidade legada (português)
        LABORATORIO = "LAB"
        MEDICO = "MED"
        EXAME_MEDICO = "MED"

    class Status:
        # Compatibilidade legada de status.
        PENDENTE = ResultState.PENDING
        EM_ANALISE = ResultState.IN_ANALYSIS
        AGUARDANDO_RESULTADO = ResultState.IN_ANALYSIS
        AGUARDANDO_VALIDACAO = ResultState.AWAITING_VALIDATION
        VALIDADA = ResultState.VALIDATED
        VALIDADO = ResultState.VALIDATED
        REJEITADA = ResultState.REJECTED
        REJEITADO = ResultState.REJECTED
        DESCONSIDERADA = ResultState.DISREGARDED
        DESCONSIDERADO = ResultState.DISREGARDED

    patient = models.ForeignKey(

        Patient,

        db_column="patient_id",
        on_delete=models.PROTECT,
        related_name="lab_requests",
        verbose_name="Paciente",
    )

    requesting_company = models.ForeignKey(

        "entidades.Company",

        db_column="requesting_company_id",
        verbose_name="Empresa solicitante",
        help_text="Empresa que subcontrata os serviços (ex.: medicina ocupacional).",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="requested_lab_requests",
    )

    external_executing_company = models.ForeignKey(

        "entidades.Company",

        db_column="external_executing_company_id",
        verbose_name="Empresa executora externa",
        help_text="Quando a clínica terceiriza a execução para outra empresa.",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="outsourced_lab_requests",
    )

    type = models.CharField(

        db_column="type",

        max_length=3,
        choices=Type.choices,
        default=Type.LABORATORY,
        db_index=True,
        verbose_name="Tipo de requisição",
    )

    exams = models.ManyToManyField(
        LabExam,
        through="LabRequestItem",
        blank=True,
        related_name="lab_requests",
        verbose_name="Exames",
    )
    samples = models.ManyToManyField(
        Sample,
        blank=True,
        related_name="lab_requests",
        db_table="clinico_requisicaoanalise_amostras",
        verbose_name="Amostras agregadas",
    )

    analyst = models.ForeignKey(

        User,

        db_column="analyst_id",
        verbose_name="O Usuario",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="processed_lab_requests",
    )

    status = models.CharField(

        db_column="status",

        max_length=30,
        choices=ResultState.CHOICES,
        default=ResultState.PENDING,
        db_index=True,
        verbose_name="Status da requisição",
    )

    clinical_status = models.CharField(

        db_column="clinical_status",

        max_length=50,
        choices=ClinicalStatus.choices,
        default=ClinicalStatus.NON_URGENT,
        db_index=True,
        verbose_name="Status clínico",

    )

    requesting_physician = models.ForeignKey(
        "recursos_humanos.Employee",
        db_column="requesting_physician_id",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="requested_lab_requests",
        verbose_name="Médico solicitante",
        help_text="Médico que solicitou os exames.",
    )

    is_occupational = models.BooleanField(
        db_column="is_occupational",
        default=False,
        db_index=True,
        verbose_name="Requisição de exames ocupacionais",
        help_text="Indica que a requisição se destina a medicina ocupacional.",
    )

    occupational_profile = models.ForeignKey(
        "clinical.OccupationalExamProfile",
        db_column="occupational_profile_id",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lab_requests",
        verbose_name="Perfil profissional (bandeja de exames)",
        help_text="Perfil ocupacional cujos exames são adicionados à requisição.",
    )

    validated_at = models.DateTimeField(
        db_column="validated_at",
        null=True,
        blank=True,
        verbose_name="Validada em",
        help_text="Momento em que a requisição foi validada para colheita.",
    )

    validated_by = models.ForeignKey(
        User,
        db_column="validated_by_id",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        verbose_name="Validada por",
    )

    collected_at = models.DateTimeField(
        db_column="collected_at",
        null=True,
        blank=True,
        verbose_name="Colheita em",
        help_text="Momento em que a colheita das amostras foi registada.",
    )

    collected_by = models.ForeignKey(
        User,
        db_column="collected_by_id",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        verbose_name="Colheita por",
    )

    has_critical_result = models.BooleanField(

        db_column="has_critical_result",

        default=False,
        db_index=True,
        verbose_name="Possui resultado crítico",
    )
    requires_fasting = models.BooleanField(
        db_column="requires_fasting",
        default=False,
        db_index=True,
        verbose_name="Requer jejum",
    )
    fasting_hours = models.PositiveIntegerField(
        db_column="fasting_hours",
        default=0,
        verbose_name="Horas de jejum",
    )

    class Meta:
        db_table = "clinico_requisicaoanalise"
        ordering = ["-created_at"]
        verbose_name = "Requisição de exam"
        verbose_name_plural = "Requisições de exams"

    # =====================================================
    # INVARIANTES
    # =====================================================

    def _esta_editavel(self):
        return self.status == ResultState.PENDING

    def _verify_terminal_state(self):
        if not self.pk:
            return

        original = self.__class__.all_objects.filter(pk=self.pk).only("status").first()

        if original and original.status in ResultState.TERMINAL:
            raise ValidationError("Requisição finalizada é imutável.")

    # =====================================================
    # SAVE CONTROLADO
    # =====================================================

    def save(self, *args, **kwargs):
        # garantir propagação de tenant
        if not self.tenant_id and self.patient_id:
            self.tenant_id = self.patient.tenant_id

        if self.pk:
            original = self.__class__.all_objects.filter(pk=self.pk).only("patient", "type").first()

            if original and original.patient_id != self.patient_id:
                raise ValidationError("Paciente da requisição é imutável.")

            if original and original.type != self.type:
                raise ValidationError("Tipo/sector da requisição é imutável.")

        self._verify_terminal_state()

        super().save(*args, **kwargs)

    # =====================================================
    # AGGREGATE ROOT
    # =====================================================

    def add_exam(self, exam: LabExam):
        if self.type != self.Type.LABORATORY:
            raise ValidationError("Esta requisição é de exams médicos e não aceita exams laboratoriais.")

        if not self._esta_editavel():
            raise ValidationError("Não é possível adicionar exams após início do processamento.")

        from .lab_request_item import LabRequestItem

        with transaction.atomic():
            try:
                item = LabRequestItem.all_objects.create(
                    request=self,
                    exam=exam,
                )
                item._create_results()
                return item

            except IntegrityError as err:
                raise ValidationError("Exame já adicionado à requisição.") from err

    def add_medical_exam(self, medical_exam):
        if self.type != self.Type.MEDICAL_EXAM:
            raise ValidationError("Esta requisição é laboratorial e não aceita exams médicos.")

        if not self._esta_editavel():
            raise ValidationError("Não é possível adicionar exams após início do processamento.")

        from .lab_request_item import LabRequestItem

        with transaction.atomic():
            try:
                item = LabRequestItem.all_objects.create(
                    request=self,
                    medical_exam=medical_exam,
                )
                item._create_results()
                return item
            except IntegrityError as err:
                raise ValidationError("Exame médico já adicionado à requisição.") from err

    # =====================================================
    # FLUXO DE COLHEITA (validação -> colheita -> laboratório)
    # =====================================================

    def validar(self, user=None):
        """Receção/laboratório valida a requisição para seguir para colheita."""
        from django.utils import timezone

        if self.status != ResultState.PENDING:
            raise ValidationError("Apenas requisições pendentes podem ser validadas.")
        if self.validated_at:
            raise ValidationError("Requisição já foi validada.")

        self.validated_at = timezone.now()
        self.validated_by = user if getattr(user, "pk", None) else None
        self.save(update_fields=["validated_at", "validated_by", "updated_at"])
        return self

    def cancelar(self, user=None):
        """Cancela uma requisição pendente antes de ir para colheita."""
        if self.status == ResultState.CANCELED:
            raise ValidationError("Requisição já foi cancelada.")
        if self.validated_at:
            raise ValidationError("Não é possível cancelar uma requisição já enviada para colheita.")
        self.status = ResultState.CANCELED
        self.save(update_fields=["status", "updated_at"])
        return self

    def registar_colheita(self, user=None):
        """Enfermagem regista a colheita; a requisição segue para o laboratório."""
        from django.utils import timezone

        if not self.validated_at:
            raise ValidationError("A requisição precisa de ser validada antes da colheita.")
        if self.collected_at:
            raise ValidationError("Colheita já registada para esta requisição.")

        self.collected_at = timezone.now()
        self.collected_by = user if getattr(user, "pk", None) else None
        self.save(update_fields=["collected_at", "collected_by", "updated_at"])
        return self

    def colher_todas_amostras(self, user=None):
        """Enfermagem regista a colheita de todas as amostras pendentes da requisição.

        Marca como coletadas todas as amostras dos exames laboratoriais que ainda
        não foram coletadas/recebidas e regista a colheita da requisição.
        """
        from django.db import transaction
        from django.utils import timezone

        from .lab_request_item import LabRequestItem

        if not self.validated_at:
            raise ValidationError("A requisição precisa de ser validada antes da colheita.")

        pendente_ids = list(
            self.items.filter(deleted=False, exam__isnull=False)
            .exclude(
                sample_status__in=[
                    LabRequestItem.SampleStatus.COLLECTED,
                    LabRequestItem.SampleStatus.RECEIVED,
                ]
            )
            .values_list("pk", flat=True)
        )
        if not pendente_ids:
            raise ValidationError("Não há amostras pendentes de colheita.")

        # Atualização em massa (não item-a-item): o save() de LabRequestItem chama
        # full_clean() e request._sync_samples_from_items() a cada gravação, o que
        # se torna O(n²) numa requisição com muitos exames (dezenas de segundos).
        # A colheita só muda o estado das amostras — não altera os exames nem a
        # composição de amostras — por isso podemos atualizar em bloco.
        with transaction.atomic():
            now = timezone.now()
            LabRequestItem.objects.filter(pk__in=pendente_ids).update(
                sample_status=LabRequestItem.SampleStatus.COLLECTED,
                sample_received_at=None,
                rejection_note="",
                updated_at=now,
            )
            # Limpa os motivos de rejeição das amostras recolhidas (recoleta).
            LabRequestItem.rejection_reasons.through.objects.filter(
                labrequestitem_id__in=pendente_ids
            ).delete()
            if not self.collected_at:
                self.registar_colheita(user=user)
        return self

    def amostras_conferidas(self) -> bool:
        """True quando todos os itens LAB têm amostra recebida na receção."""
        items = self.items.filter(deleted=False, exam__isnull=False)
        if not items.exists():
            return False
        from .lab_request_item import LabRequestItem

        return not items.exclude(sample_status=LabRequestItem.SampleStatus.RECEIVED).exists()

    def repetir_colheita(self, user=None):
        """Enfermagem repete a colheita dos itens com amostra rejeitada."""
        from django.utils import timezone

        from .lab_request_item import LabRequestItem

        rejected = self.items.filter(deleted=False, sample_status=LabRequestItem.SampleStatus.REJECTED)
        if not rejected.exists():
            raise ValidationError("Não há amostras rejeitadas para repetir a colheita.")

        for item in rejected:
            item.sample_status = LabRequestItem.SampleStatus.AWAITING
            item.save(update_fields=["sample_status", "updated_at"])

        self.collected_at = timezone.now()
        self.collected_by = user if getattr(user, "pk", None) else None
        self.save(update_fields=["collected_at", "collected_by", "updated_at"])
        return self

    def transferir_analise(self, company, user=None):
        """Transfere a execução das análises para uma empresa/unidade externa."""
        if company is None:
            raise ValidationError("Indique a empresa executora externa de destino.")
        if not self.collected_at:
            raise ValidationError("A colheita precisa de estar registada antes da transferência.")
        if self.status != ResultState.PENDING:
            raise ValidationError("Apenas requisições pendentes podem ser transferidas.")

        self.external_executing_company = company
        self.save(update_fields=["external_executing_company", "updated_at"])
        return self

    def iniciar_processamento(self, user=None):
        """Laboratório inicia o processamento (status passa a em análise)."""
        if not self.collected_at:
            raise ValidationError("A colheita precisa de ser registada antes do processamento.")
        if self.type == self.Type.LABORATORY and not self.amostras_conferidas():
            raise ValidationError("Todas as amostras precisam de ser recebidas na receção de amostras.")

        if user is not None and getattr(user, "pk", None) and not self.analyst_id:
            self.analyst = user
            self.save(update_fields=["analyst", "updated_at"])

        self.transicionar(ResultState.IN_ANALYSIS)
        return self

    # =====================================================
    # TRANSIÇÃO DE ESTADO
    # =====================================================

    def transicionar(self, novo_status):
        with transaction.atomic():
            request = LabRequest.all_objects.select_for_update().get(pk=self.pk)

            ResultStateMachine.validate_transition(
                request.status,
                novo_status,
            )

            request.status = novo_status

            request.save(update_fields=["status"])

    # =====================================================
    # RESULTADO
    # =====================================================

    def get_result(self):
        from .result import Result

        return Result.objects.filter(request=self).first()

    def create_result(self):
        from .result import Result

        result, _ = Result.objects.get_or_create(
            request=self,
            defaults={"tenant": self.tenant},
        )
        return result

    def create_automatic_results(self):
        return self.create_result()

    # =====================================================
    # VIEWS/DRF HELPERS
    # =====================================================

    @property
    def medical_exams(self):
        """
        Exames médicos associados via RequisicaoItem.

        Nota: não existe ManyToMany explícito para ExameMedico; essa propriedade
        existe para suportar serialização (API) e manter a regra de "requisição
        por sector" sem duplicar model.
        """
        from .medical_exam import MedicalExam

        try:
            return MedicalExam.objects.filter(
                lab_request_items__request=self,
                lab_request_items__deleted=False,
            ).distinct()
        except FieldError:
            # Compatibilidade defensiva para ambientes com estado antigo de
            # relação reversa (evita 500 em rollout parcial de migrações/código).
            return MedicalExam.objects.filter(
                lab_requests__request=self,
                lab_requests__deleted=False,
            ).distinct()

    def _collection_items_queryset(self):
        return (
            self.items.filter(
                deleted=False,
                exam__isnull=False,
                exam__deleted=False,
            )
            .select_related("exam", "exam__sample_type")
            .prefetch_related("exam__sample_options")
            .order_by("position", "id")
        )

    def build_collection_guidance(self):
        """
        Estrutura operacional para orientar a enfermagem na coleta:
        exame -> opções de amostra -> frasco/tubo -> volume mínimo.
        """
        guidance = []

        for item in self._collection_items_queryset():
            exam = getattr(item, "exam", None)
            if exam is None:
                continue

            sample_options = []
            for sample in exam.get_sample_options():
                sample_options.append(
                    {
                        "sample_id": sample.id,
                        "sample_code": sample.custom_id,
                        "sample_name": sample.name,
                        "bottle_type": sample.bottle_type,
                        "bottle_type_label": sample.get_bottle_type_display(),
                        "cap_color": sample.cap_color or "",
                        "minimum_volume_ml": str(sample.minimum_volume_ml),
                        "fasting_required": bool(sample.fasting_required),
                        "fasting_hours": int(sample.fasting_hours or 0),
                        "collection_instructions": sample.collection_instructions or "",
                    }
                )

            guidance.append(
                {
                    "item_id": item.id,
                    "item_code": item.custom_id,
                    "exam_id": exam.id,
                    "exam_code": exam.custom_id,
                    "exam_name": exam.name,
                    "sample_options": sample_options,
                }
            )

        return guidance

    def _sync_nursing_collection_entry(self):
        if self.type != self.Type.LABORATORY:
            return

        from apps.nursing.services.lab_request_intake import sync_lab_collection_record

        sync_lab_collection_record(self)

    def _sync_samples_from_items(self):
        if not self.pk:
            return

        guidance = self.build_collection_guidance()

        sample_ids = set()
        requires_fasting = False
        fasting_hours = 0

        for exam_entry in guidance:
            for sample in exam_entry.get("sample_options", []):
                sample_id = sample.get("sample_id")
                if sample_id:
                    sample_ids.add(sample_id)

                if bool(sample.get("fasting_required")):
                    requires_fasting = True
                    fasting_hours = max(fasting_hours, int(sample.get("fasting_hours") or 0))

        self.samples.set(sorted(sample_ids))

        updates = {}
        if self.requires_fasting != requires_fasting:
            updates["requires_fasting"] = requires_fasting
            self.requires_fasting = requires_fasting
        if self.fasting_hours != fasting_hours:
            updates["fasting_hours"] = fasting_hours
            self.fasting_hours = fasting_hours

        if updates:
            from django.utils import timezone

            updates["updated_at"] = timezone.now()
            self.__class__.all_objects.filter(pk=self.pk).update(**updates)

        transaction.on_commit(self._sync_nursing_collection_entry)

    @property
    def fasting_summary(self):
        return {
            "requires_fasting": bool(self.requires_fasting),
            "fasting_hours": int(self.fasting_hours or 0),
        }

    @property
    def fasting_info(self):
        return self.fasting_summary

    @property
    def itens(self):
        # Compatibilidade legada (português) para relation manager.
        return self.items

    # =====================================================
    # SINCRONIZAÇÃO CLÍNICA
    # =====================================================

    def update_clinical_status(self):
        # Não recalcula nem altera requisição já finalizada (imutável).
        if self.status in ResultState.TERMINAL:
            try:
                if hasattr(self, "result") and not self.result.finalized:
                    self.result.finalized = True
                    self.result.save(update_fields=["finalized"])
            except Exception:
                pass
            return

        novo_status_clinico = ClinicalStatus.NON_URGENT
        possui_critico = False
        novo_status_fluxo = ResultState.PENDING
        result_finalized = False

        if hasattr(self, "result"):
            result = self.result
            itens = result.items.all()

            stats = itens.aggregate(
                total=models.Count("id"),
                criticos=models.Count("id", filter=models.Q(critical_alert=True)),
                urgentes=models.Count("id", filter=models.Q(clinical_status=ClinicalStatus.URGENT)),
                muito_urgentes=models.Count("id", filter=models.Q(clinical_status=ClinicalStatus.VERY_URGENT)),
                pendentes=models.Count("id", filter=models.Q(status=ResultState.PENDING)),
                aguardando=models.Count("id", filter=models.Q(status=ResultState.AWAITING_VALIDATION)),
                validados=models.Count("id", filter=models.Q(status=ResultState.VALIDATED)),
                desconsiderados=models.Count("id", filter=models.Q(status=ResultState.DISREGARDED)),
                desconsiderados_validados=models.Count(
                    "id",
                    filter=models.Q(
                        status=ResultState.DISREGARDED,
                        disregard_validation_date__isnull=False,
                    ),
                ),
            )

            total = int(stats.get("total") or 0)
            criticos = int(stats.get("criticos") or 0)
            urgentes = int(stats.get("urgentes") or 0)
            muito_urgentes = int(stats.get("muito_urgentes") or 0)

            possui_critico = criticos > 0

            if total == 0:
                novo_status_clinico = ClinicalStatus.NON_URGENT
                novo_status_fluxo = ResultState.PENDING
            else:
                if possui_critico:
                    novo_status_clinico = ClinicalStatus.EXTREMELY_URGENT
                elif muito_urgentes > 0:
                    novo_status_clinico = ClinicalStatus.VERY_URGENT
                elif urgentes > 0:
                    novo_status_clinico = ClinicalStatus.URGENT
                else:
                    novo_status_clinico = ClinicalStatus.NON_URGENT

                pendentes = int(stats.get("pendentes") or 0)
                aguardando = int(stats.get("aguardando") or 0)
                validados = int(stats.get("validados") or 0)
                desconsiderados = int(stats.get("desconsiderados") or 0)
                desconsiderados_validados = int(stats.get("desconsiderados_validados") or 0)
                entradas_concluidas = (aguardando + validados + desconsiderados) == total

                if (validados + desconsiderados) == total:
                    novo_status_fluxo = ResultState.VALIDATED
                elif entradas_concluidas:
                    novo_status_fluxo = ResultState.AWAITING_VALIDATION
                elif pendentes == total:
                    novo_status_fluxo = ResultState.PENDING
                else:
                    novo_status_fluxo = ResultState.IN_ANALYSIS

            result_finalized = novo_status_fluxo == ResultState.VALIDATED

            if result.finalized != result_finalized:
                result.finalized = result_finalized
                result.save(update_fields=["finalized"])

        update_fields = []
        if self.clinical_status != novo_status_clinico:
            self.clinical_status = novo_status_clinico
            update_fields.append("clinical_status")

        if self.has_critical_result != possui_critico:
            self.has_critical_result = possui_critico
            update_fields.append("has_critical_result")

        if self.status != novo_status_fluxo:
            self.status = novo_status_fluxo
            update_fields.append("status")

        if update_fields:
            self.save(update_fields=update_fields)

    def apply_status(self, new_status):
        if self.status == new_status:
            return self
        self.status = new_status
        self.save(update_fields=["status"])
        return self

    @property
    def patient_tenant(self):
        if self.patient:
            return getattr(self.patient, "tenant", None)
        return None

    _verificar_status_terminal = _verify_terminal_state
    adicionar_exam = add_exam
    adicionar_medical_exam = add_medical_exam
    criar_result = create_result
    criar_resultados_automaticos = create_automatic_results
    aplicar_status = apply_status
    exams_medicos = medical_exams
    atualizar_clinical_status = update_clinical_status
    tenant_do_patient = patient_tenant

    def __str__(self):
        return f"{self.custom_id} - {self.patient.name}"
