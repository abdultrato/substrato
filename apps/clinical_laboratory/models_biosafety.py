"""Biossegurança do laboratório (bloco biosafety).

Segurança biológica, exposição ocupacional, EPIs, resíduos, descontaminação,
derrames, vacinação e inspeções. Liga-se à qualidade: um incidente de exposição
pode gerar uma não conformidade (`laboratorio.Nonconformity`).
"""

from django.conf import settings
from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel

USER = settings.AUTH_USER_MODEL


class BiologicalHazard(NoNameCoreModel):
    """Registo de perigo biológico (agente, grupo de risco, via, contenção)."""

    prefix = "BHAZ"

    class RiskGroup(models.TextChoices):
        RG1 = "RG1", "Grupo de risco 1"
        RG2 = "RG2", "Grupo de risco 2"
        RG3 = "RG3", "Grupo de risco 3"
        RG4 = "RG4", "Grupo de risco 4"

    name = models.CharField("Agente/perigo", db_column="name", max_length=160)
    hazard_type = models.CharField("Tipo", db_column="hazard_type", max_length=80, blank=True, default="")
    risk_group = models.CharField("Grupo de risco", db_column="risk_group", max_length=4,
                                  choices=RiskGroup.choices, default=RiskGroup.RG2, db_index=True)
    transmission_route = models.CharField("Via de transmissão", db_column="transmission_route",
                                          max_length=160, blank=True, default="")
    required_ppe = models.CharField("EPI requerido", db_column="required_ppe", max_length=200, blank=True, default="")
    containment_level = models.CharField("Nível de contenção", db_column="containment_level",
                                         max_length=20, blank=True, default="")
    handling_notes = models.TextField("Manipulação", db_column="handling_notes", blank=True, default="")
    active = models.BooleanField("Ativo", db_column="active", default=True, db_index=True)

    class Meta:
        db_table = "laboratorio_bio_perigo"
        verbose_name = "Perigo biológico"
        verbose_name_plural = "Perigos biológicos"
        ordering = ["name"]
        indexes = [models.Index(fields=["tenant", "risk_group", "active"])]

    def __str__(self) -> str:
        return f"{self.name} ({self.risk_group})"


class ExposureIncident(NoNameCoreModel):
    """Incidente de exposição ocupacional a material biológico (inclui investigação)."""

    prefix = "BEXP"

    class ExposureType(models.TextChoices):
        NEEDLESTICK = "PICADA", "Picada de agulha"
        MUCOSAL = "MUCOSA", "Contacto com mucosa"
        SKIN = "PELE", "Contacto com pele"
        CUT = "CORTE", "Corte com material contaminado"
        AEROSOL = "AEROSSOL", "Inalação de aerossol"
        CULTURE = "CULTURA", "Contacto com cultura"
        OTHER = "OUTRO", "Outro"

    class Status(models.TextChoices):
        REPORTED = "REPORTADO", "Reportado"
        UNDER_REVIEW = "EM_ANALISE", "Em análise"
        MEDICAL_FOLLOWUP = "SAUDE_OCUP", "Encaminhado a saúde ocupacional"
        FOLLOWUP = "SEGUIMENTO", "Seguimento em curso"
        CLOSED = "FECHADO", "Fechado"

    staff = models.ForeignKey(USER, db_column="staff_id", verbose_name="Colaborador exposto",
                              on_delete=models.PROTECT, related_name="+")
    incident_at = models.DateTimeField("Data/hora", db_column="incident_at", default=timezone.now)
    exposure_type = models.CharField("Tipo de exposição", db_column="exposure_type", max_length=10,
                                     choices=ExposureType.choices, default=ExposureType.NEEDLESTICK, db_index=True)
    material_involved = models.CharField("Material envolvido", db_column="material_involved",
                                         max_length=160, blank=True, default="")
    body_site = models.CharField("Local do corpo", db_column="body_site", max_length=120, blank=True, default="")
    activity = models.CharField("Atividade no momento", db_column="activity", max_length=200,
                                blank=True, default="")
    immediate_action = models.TextField("Ação imediata", db_column="immediate_action", blank=True, default="")
    reported_to = models.CharField("Reportado a", db_column="reported_to", max_length=160, blank=True, default="")
    requires_medical_followup = models.BooleanField("Requer seguimento médico",
                                                    db_column="requires_medical_followup", default=True)
    # Investigação (folded)
    root_cause = models.TextField("Causa raiz", db_column="root_cause", blank=True, default="")
    contributing_factors = models.TextField("Fatores contribuintes", db_column="contributing_factors",
                                            blank=True, default="")
    conclusion = models.TextField("Conclusão", db_column="conclusion", blank=True, default="")
    investigated_by = models.ForeignKey(USER, db_column="investigated_by_id", verbose_name="Investigado por",
                                        on_delete=models.PROTECT, related_name="+", null=True, blank=True)
    investigated_at = models.DateTimeField("Investigado em", db_column="investigated_at", null=True, blank=True)
    nonconformity = models.ForeignKey("laboratorio.Nonconformity", db_column="nonconformity_id",
                                      verbose_name="NC gerada", on_delete=models.SET_NULL,
                                      related_name="exposure_incidents", null=True, blank=True)
    status = models.CharField("Estado", max_length=12, choices=Status.choices,
                              default=Status.REPORTED, db_index=True)

    class Meta:
        db_table = "laboratorio_bio_exposicao"
        verbose_name = "Incidente de exposição"
        verbose_name_plural = "Incidentes de exposição"
        ordering = ["-incident_at"]
        indexes = [models.Index(fields=["tenant", "status", "exposure_type"])]

    def __str__(self) -> str:
        return f"{self.get_exposure_type_display()} ({self.get_status_display()})"


class PPEItem(NoNameCoreModel):
    """Item de equipamento de proteção individual (catálogo + stock mínimo)."""

    prefix = "BPPE"

    name = models.CharField("Nome", db_column="name", max_length=120)
    category = models.CharField("Categoria", db_column="category", max_length=80, blank=True, default="")
    size = models.CharField("Tamanho", db_column="size", max_length=40, blank=True, default="")
    unit = models.CharField("Unidade", db_column="unit", max_length=30, blank=True, default="un")
    stock_controlled = models.BooleanField("Stock controlado", db_column="stock_controlled", default=True)
    minimum_stock = models.PositiveIntegerField("Stock mínimo", db_column="minimum_stock", default=0)
    current_stock = models.IntegerField("Stock atual", db_column="current_stock", default=0)
    active = models.BooleanField("Ativo", db_column="active", default=True, db_index=True)

    class Meta:
        db_table = "laboratorio_bio_epi"
        verbose_name = "EPI"
        verbose_name_plural = "EPIs"
        ordering = ["name"]
        indexes = [models.Index(fields=["tenant", "active"])]

    @property
    def is_below_minimum(self) -> bool:
        return bool(self.stock_controlled and self.current_stock < self.minimum_stock)

    def __str__(self) -> str:
        return self.name


class PPEDistribution(NoNameCoreModel):
    """Distribuição de EPI a colaborador ou sector."""

    prefix = "BPPD"

    ppe = models.ForeignKey("laboratorio.PPEItem", db_column="ppe_id", verbose_name="EPI",
                            on_delete=models.PROTECT, related_name="distributions")
    staff = models.ForeignKey(USER, db_column="staff_id", verbose_name="Colaborador",
                              on_delete=models.PROTECT, related_name="+", null=True, blank=True)
    department = models.CharField("Sector", db_column="department", max_length=120, blank=True, default="")
    quantity = models.PositiveIntegerField("Quantidade", db_column="quantity", default=1)
    distributed_by = models.ForeignKey(USER, db_column="distributed_by_id", verbose_name="Distribuído por",
                                       on_delete=models.PROTECT, related_name="+", null=True, blank=True)
    distribution_date = models.DateField("Data", db_column="distribution_date", default=timezone.localdate)
    purpose = models.CharField("Finalidade", db_column="purpose", max_length=160, blank=True, default="")

    class Meta:
        db_table = "laboratorio_bio_epi_distribuicao"
        verbose_name = "Distribuição de EPI"
        verbose_name_plural = "Distribuições de EPI"
        ordering = ["-distribution_date"]
        indexes = [models.Index(fields=["tenant", "ppe"])]

    def __str__(self) -> str:
        return f"{self.ppe_id} x{self.quantity}"


class WasteRecord(NoNameCoreModel):
    """Resíduo laboratorial (gestão + movimentos + perfurocortantes), com ciclo de vida."""

    prefix = "BWST"

    class WasteType(models.TextChoices):
        BIOLOGICAL = "BIOLOGICO", "Biológico"
        SHARPS = "PERFUROCORTANTE", "Perfurocortante"
        CHEMICAL = "QUIMICO", "Químico"
        GENERAL = "GERAL", "Geral"
        INFECTIOUS = "INFECCIOSO", "Infeccioso"
        ANATOMICAL = "ANATOMICO", "Anatómico"
        CULTURE = "CULTURA", "Cultura"
        EXPIRED_REAGENT = "REAGENTE_VENCIDO", "Reagente vencido"

    class Status(models.TextChoices):
        GENERATED = "GERADO", "Gerado"
        STORED = "ARMAZENADO", "Armazenado"
        COLLECTED = "RECOLHIDO", "Recolhido"
        TREATED = "TRATADO", "Tratado"
        DISPOSED = "DESCARTADO", "Descartado"
        INCIDENT = "INCIDENTE", "Incidente reportado"

    waste_type = models.CharField("Tipo de resíduo", db_column="waste_type", max_length=18,
                                  choices=WasteType.choices, default=WasteType.BIOLOGICAL, db_index=True)
    department = models.CharField("Sector", db_column="department", max_length=120, blank=True, default="")
    quantity = models.CharField("Quantidade", db_column="quantity", max_length=60, blank=True, default="")
    container_type = models.CharField("Tipo de contentor", db_column="container_type", max_length=80,
                                      blank=True, default="")
    container_code = models.CharField("Código do contentor", db_column="container_code", max_length=60,
                                      blank=True, default="", db_index=True)
    fill_level = models.CharField("Nível de enchimento (perfurocortantes)", db_column="fill_level",
                                  max_length=40, blank=True, default="")
    generated_at = models.DateTimeField("Gerado em", db_column="generated_at", default=timezone.now)
    storage_location = models.CharField("Local de armazenamento", db_column="storage_location",
                                        max_length=120, blank=True, default="")
    collected_by = models.ForeignKey(USER, db_column="collected_by_id", verbose_name="Recolhido por",
                                     on_delete=models.PROTECT, related_name="+", null=True, blank=True)
    disposal_method = models.CharField("Método de descarte", db_column="disposal_method", max_length=120,
                                       blank=True, default="")
    disposal_date = models.DateField("Data de descarte", db_column="disposal_date", null=True, blank=True)
    status = models.CharField("Estado", max_length=12, choices=Status.choices,
                              default=Status.GENERATED, db_index=True)

    class Meta:
        db_table = "laboratorio_bio_residuo"
        verbose_name = "Registo de resíduo"
        verbose_name_plural = "Registos de resíduos"
        ordering = ["-generated_at"]
        indexes = [models.Index(fields=["tenant", "waste_type", "status"])]

    def __str__(self) -> str:
        return f"{self.get_waste_type_display()} ({self.get_status_display()})"


class DecontaminationRecord(NoNameCoreModel):
    """Registo de descontaminação (bancada, cabine, centrífuga, sala...)."""

    prefix = "BDEC"

    area = models.CharField("Área", db_column="area", max_length=160)
    equipment = models.CharField("Equipamento", db_column="equipment", max_length=160, blank=True, default="")
    disinfectant = models.CharField("Desinfetante", db_column="disinfectant", max_length=120, blank=True, default="")
    concentration = models.CharField("Concentração", db_column="concentration", max_length=60, blank=True, default="")
    performed_by = models.ForeignKey(USER, db_column="performed_by_id", verbose_name="Executado por",
                                     on_delete=models.PROTECT, related_name="+", null=True, blank=True)
    performed_at = models.DateTimeField("Data/hora", db_column="performed_at", default=timezone.now)
    reason = models.CharField("Motivo", db_column="reason", max_length=200, blank=True, default="")
    verified_by = models.ForeignKey(USER, db_column="verified_by_id", verbose_name="Verificado por",
                                    on_delete=models.PROTECT, related_name="+", null=True, blank=True)

    class Meta:
        db_table = "laboratorio_bio_descontaminacao"
        verbose_name = "Descontaminação"
        verbose_name_plural = "Descontaminações"
        ordering = ["-performed_at"]
        indexes = [models.Index(fields=["tenant", "performed_at"])]

    def __str__(self) -> str:
        return f"{self.area} ({self.performed_at:%Y-%m-%d})"


class SpillResponseRecord(NoNameCoreModel):
    """Resposta a derrame biológico ou químico."""

    prefix = "BSPL"

    class SpillType(models.TextChoices):
        BIOLOGICAL = "BIOLOGICO", "Biológico"
        CHEMICAL = "QUIMICO", "Químico"

    spill_type = models.CharField("Tipo", db_column="spill_type", max_length=10,
                                  choices=SpillType.choices, default=SpillType.BIOLOGICAL, db_index=True)
    location = models.CharField("Local", db_column="location", max_length=160)
    material_involved = models.CharField("Material", db_column="material_involved", max_length=160,
                                         blank=True, default="")
    estimated_volume = models.CharField("Volume estimado", db_column="estimated_volume", max_length=60,
                                        blank=True, default="")
    immediate_action = models.TextField("Ação imediata", db_column="immediate_action", blank=True, default="")
    disinfection_method = models.CharField("Método de desinfeção", db_column="disinfection_method",
                                           max_length=120, blank=True, default="")
    staff_exposed = models.BooleanField("Houve exposição", db_column="staff_exposed", default=False)
    exposure_incident = models.ForeignKey("laboratorio.ExposureIncident", db_column="exposure_incident_id",
                                          verbose_name="Incidente de exposição", on_delete=models.SET_NULL,
                                          related_name="spills", null=True, blank=True)
    occurred_at = models.DateTimeField("Ocorreu em", db_column="occurred_at", default=timezone.now)

    class Meta:
        db_table = "laboratorio_bio_derrame"
        verbose_name = "Resposta a derrame"
        verbose_name_plural = "Respostas a derrames"
        ordering = ["-occurred_at"]

    def __str__(self) -> str:
        return f"Derrame {self.get_spill_type_display()} @ {self.location}"


class VaccinationRecord(NoNameCoreModel):
    """Estado vacinal ocupacional de um colaborador."""

    prefix = "BVAC"

    class Status(models.TextChoices):
        UP_TO_DATE = "EM_DIA", "Em dia"
        DUE = "A_VENCER", "A vencer"
        OVERDUE = "VENCIDA", "Vencida"

    staff = models.ForeignKey(USER, db_column="staff_id", verbose_name="Colaborador",
                              on_delete=models.PROTECT, related_name="+")
    vaccine = models.CharField("Vacina", db_column="vaccine", max_length=120)
    dose_number = models.PositiveSmallIntegerField("Dose", db_column="dose_number", default=1)
    vaccination_date = models.DateField("Data", db_column="vaccination_date", null=True, blank=True)
    next_dose_due = models.DateField("Próxima dose", db_column="next_dose_due", null=True, blank=True, db_index=True)
    document = models.CharField("Documento", db_column="document", max_length=120, blank=True, default="")
    status = models.CharField("Estado", max_length=10, choices=Status.choices,
                              default=Status.UP_TO_DATE, db_index=True)

    class Meta:
        db_table = "laboratorio_bio_vacinacao"
        verbose_name = "Registo de vacinação"
        verbose_name_plural = "Registos de vacinação"
        ordering = ["-vaccination_date"]
        indexes = [models.Index(fields=["tenant", "status"])]

    def is_due(self, today=None) -> bool:
        today = today or timezone.localdate()
        return bool(self.next_dose_due and self.next_dose_due <= today)

    def __str__(self) -> str:
        return f"{self.vaccine} ({self.staff_id})"


class BiosafetyInspection(NoNameCoreModel):
    """Inspeção periódica de biossegurança."""

    prefix = "BINS"

    class Status(models.TextChoices):
        PLANNED = "PLANEADA", "Planeada"
        COMPLETED = "CONCLUIDA", "Concluída"
        FINDINGS_OPEN = "ACHADOS_ABERTOS", "Achados em aberto"
        CORRECTIVE = "CORRETIVA_REQUERIDA", "Ação corretiva requerida"
        CLOSED = "FECHADA", "Fechada"

    area = models.CharField("Área", db_column="area", max_length=160)
    inspector = models.ForeignKey(USER, db_column="inspector_id", verbose_name="Inspetor",
                                  on_delete=models.PROTECT, related_name="+", null=True, blank=True)
    inspection_date = models.DateField("Data", db_column="inspection_date", default=timezone.localdate, db_index=True)
    checklist = models.JSONField("Checklist", db_column="checklist", default=dict, blank=True)
    findings = models.TextField("Achados", db_column="findings", blank=True, default="")
    nonconformity = models.ForeignKey("laboratorio.Nonconformity", db_column="nonconformity_id",
                                      verbose_name="NC gerada", on_delete=models.SET_NULL,
                                      related_name="biosafety_inspections", null=True, blank=True)
    status = models.CharField("Estado", max_length=20, choices=Status.choices,
                              default=Status.PLANNED, db_index=True)

    class Meta:
        db_table = "laboratorio_bio_inspecao"
        verbose_name = "Inspeção de biossegurança"
        verbose_name_plural = "Inspeções de biossegurança"
        ordering = ["-inspection_date"]
        indexes = [models.Index(fields=["tenant", "status"])]

    def __str__(self) -> str:
        return f"{self.area} ({self.get_status_display()})"
