"""Laboratório Clínico — fluxo completo pré-analítico → analítico → pós-analítico.

Modelo de dados rastreável: catálogo → pedido → colheita → amostra → recepção/
rejeição → resultado → validação técnica/clínica → laudo → comunicação de
resultado crítico. Separa explicitamente Pedido, Amostra e Resultado:

    LabOrder → LabOrderItem → LabSample → LabResult → ResultValidation → LabReport

Convenções do projeto: tenant-scoped (CoreModel/NoNameCoreModel), db_table em PT
com prefixo ``laboratorio_``, custom_id por ``prefix``, FKs a ``clinical.Patient``
e ``identidade.User``.
"""

from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.db import models
from django.utils import timezone

from core.constants.laboratory.units import DefaultUnit
from core.models.base import CoreModel, NoNameCoreModel
from infrastructure.orm.fields.money_field import MoneyField

USER = settings.AUTH_USER_MODEL  # "identidade.User"


class SampleType(models.TextChoices):
    WHOLE_BLOOD = "SANGUE_TOTAL", "Sangue total"
    SERUM = "SORO", "Soro"
    PLASMA = "PLASMA", "Plasma"
    URINE = "URINA", "Urina"
    STOOL = "FEZES", "Fezes"
    SPUTUM = "ESCARRO", "Escarro"
    CSF = "LCR", "Líquor (LCR)"
    SWAB = "ZARAGATOA", "Zaragatoa/Swab"
    SEMEN = "SEMEN", "Sémen"
    BONE_MARROW = "MEDULA", "Medula óssea"
    BODY_FLUID = "LIQUIDO", "Líquido biológico"
    OTHER = "OUTRO", "Outro"


class LabPriority(models.TextChoices):
    STAT = "STAT", "STAT (emergência)"
    URGENT = "URGENTE", "Urgente"
    ROUTINE = "ROTINA", "Rotina"
    SCHEDULED = "AGENDADO", "Agendado"


class LabMethod(models.TextChoices):
    """Método analítico do exame (catálogo).

    Os valores correspondem ao vocabulário já existente no catálogo, ordenados
    pelo rótulo para apresentação no formulário.
    """

    AGLUTINACAO = 'Aglutinacao', 'Aglutinação'
    AGLUTINACAOLATEX = 'AglutinacaoLatex', 'Aglutinação em látex'
    AUTOMATIZADO = 'Automatizado', 'Automatizado'
    AVALIACAOMACROSCOPICA = 'AvaliacaoMacroscopica', 'Avaliação macroscópica'
    BAERMANN = 'Baermann', 'Baermann'
    BIURETO = 'Biureto', 'Biureto'
    CINETICOCOLORIMETRICO = 'CineticoColorimetrico', 'Cinético colorimétrico'
    CINETICOENZIMATICO = 'CineticoEnzimatico', 'Cinético enzimático'
    CINETICOUV = 'CineticoUV', 'Cinético UV'
    COAGULOMETRIA = 'Coagulometria', 'Coagulometria'
    COLORACAOGRAM = 'ColoracaoGram', 'Coloração de Gram'
    COLORACAOZIEHL = 'ColoracaoZiehl', 'Coloração de Ziehl-Neelsen'
    COLORIMETRICO = 'Colorimetrico', 'Colorimétrico'
    CONCENTRACAOFORMOLETER = 'ConcentracaoFormolEter', 'Concentração formol-éter'
    CROMOGENICO = 'Cromogenico', 'Cromogénico'
    CULTURA = 'Cultura', 'Cultura'
    CULTURAMICOLOGICA = 'CulturaMicologica', 'Cultura micológica'
    CULTURAQUANTITATIVA = 'CulturaQuantitativa', 'Cultura quantitativa'
    CULTURASELETIVA = 'CulturaSeletiva', 'Cultura seletiva'
    CULTURASEMIQUANTITATIVA = 'CulturaSemiquantitativa', 'Cultura semiquantitativa'
    CALCULO = 'Calculo', 'Cálculo'
    DIAZOCOLORIMETRICO = 'DiazoColorimetrico', 'Diazo-colorimétrico'
    DRVVT = 'dRVVT', 'dRVVT'
    ELISA = 'ELISA', 'ELISA'
    ELETRODOIONSELETIVO = 'EletrodoIonSeletivo', 'Elétrodo íon-seletivo (ISE)'
    ENZIMATICO = 'Enzimatico', 'Enzimático'
    ENZIMATICOCOLORIMETRICO = 'EnzimaticoColorimetrico', 'Enzimático colorimétrico'
    ENZIMATICODIRETO = 'EnzimaticoDireto', 'Enzimático direto'
    ESFREGACODELGADO = 'EsfregacoDelgado', 'Esfregaço delgado'
    ESPECTROFOTOMETRICO_COLORIMETRICO = 'espectrofotometrico/colorimetrico', 'Espectrofotométrico / Colorimétrico'
    EXAMEMICOLOGICODIRETO = 'ExameMicologicoDireto', 'Exame micológico direto'
    FITAGOMADA = 'FitaGomada', 'Fita gomada'
    FLOCULACAO = 'Floculacao', 'Floculação'
    FISICOQUIMICOMICROSCOPIA = 'FisicoQuimicoMicroscopia', 'Físico-químico + microscopia'
    GENOTIPAGEM = 'Genotipagem', 'Genotipagem'
    GOTAESPESSA = 'GotaEspessa', 'Gota espessa'
    HEMAGLUTINACAO = 'Hemaglutinacao', 'Hemaglutinação'
    HEMATOLOGIAAUTOMATIZADA = 'HematologiaAutomatizada', 'Hematologia automatizada'
    HIBRIDIZACAOMOLECULAR = 'HibridizacaoMolecular', 'Hibridização molecular'
    HPLC = 'HPLC', 'HPLC'
    IMUNOCROMATOGRAFIA = 'Imunocromatografia', 'Imunocromatografia'
    IMUNOENSAIO = 'Imunoensaio', 'Imunoensaio'
    IMUNOINIBICAO = 'Imunoinibicao', 'Imunoinibição'
    IMUNOTURBIDIMETRIA = 'Imunoturbidimetria', 'Imunoturbidimetria'
    IVYDUKE = 'IvyDuke', 'Ivy / Duke'
    KATOKATZ = 'KatoKatz', 'Kato-Katz'
    KIRBYBAUER = 'KirbyBauer', 'Kirby-Bauer'
    MICROSCOPIASEDIMENTO = 'MicroscopiaSedimento', 'Microscopia de sedimento'
    MICROSCOPIAOPTICA = 'MicroscopiaOptica', 'Microscopia óptica'
    MICROSCOPICO = 'Microscopico', 'Microscópico'
    METODOMANUAL = 'MetodoManual', 'Método manual'
    NAAT = 'NAAT', 'NAAT'
    PCR = 'PCR', 'PCR'
    PCRALELOESPECIFICO = 'PCRAleloEspecifico', 'PCR alelo-específico'
    PCRTEMPOREAL = 'PCRTempoReal', 'PCR em tempo real'
    PCRMULTIPLEX = 'PCRMultiplex', 'PCR multiplex'
    PCRMUTACIONAL = 'PCRMutacional', 'PCR mutacional'
    PCRQUALITATIVO = 'PCRQualitativo', 'PCR qualitativo'
    PCRQUANTITATIVO = 'PCRQuantitativo', 'PCR quantitativo'
    QUIMIOLUMINESCENCIA = 'Quimioluminescencia', 'Quimioluminescência (CLIA)'
    RTPCRMULTIPLEX = 'RTPCRMultiplex', 'RT-PCR multiplex'
    RTPCRQUALITATIVO = 'RTPCRQualitativo', 'RT-PCR qualitativo'
    RTPCRQUANTITATIVO = 'RTPCRQuantitativo', 'RT-PCR quantitativo'
    RTQPCR = 'RTqPCR', 'RT-qPCR'
    SEDIMENTACAO = 'Sedimentacao', 'Sedimentação'
    SEQUENCIAMENTO = 'Sequenciamento', 'Sequenciamento'
    TIRAREAGENTE = 'TiraReagente', 'Tira reagente'
    VERDEBROMOCRESOL = 'VerdeBromocresol', 'Verde de bromocresol'


# =====================================================================
# CATÁLOGO
# =====================================================================
class LabSector(CoreModel):
    """Sector técnico do laboratório (Hematologia, Bioquímica, ...)."""

    prefix = "LC"

    code = models.CharField("Código", db_column="code", max_length=20, db_index=True)
    active = models.BooleanField("Ativo", db_column="active", default=True, db_index=True)

    class Meta:
        db_table = "laboratorio_sector"
        verbose_name = "Sector laboratorial"
        verbose_name_plural = "Sectores laboratoriais"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "code"], condition=models.Q(deleted=False),
                                    name="uniq_lab_sector_code"),
        ]

    def __str__(self) -> str:
        return self.name or self.code

    def activate(self):
        """Reativa o sector técnico no catálogo do laboratório."""
        self.active = True
        self.save(update_fields=["active", "updated_at"])
        return self

    def deactivate(self):
        """Suspende o sector — deixa de receber novas requisições/bancadas."""
        self.active = False
        self.save(update_fields=["active", "updated_at"])
        return self


class LabContainerType(CoreModel):
    """Tipo de tubo/recipiente para coleta de amostras biológicas.

    Define o recipiente correto, aditivo/conservante, volume, inversões e
    condições de conservação. Usado como guia para a enfermagem na coleta.
    """

    prefix = "LCONT"

    class CapColor(models.TextChoices):
        RED = "vermelho", "Vermelho"
        GOLD = "dourado", "Dourado / Amarelo SST"
        PURPLE = "roxo", "Roxo / Lilás (EDTA)"
        LIGHT_BLUE = "azul_claro", "Azul claro (Citrato)"
        GREY = "cinzento", "Cinzento (Fluoreto)"
        DARK_GREEN = "verde_escuro", "Verde escuro (Heparina)"
        LIGHT_GREEN = "verde_claro", "Verde claro (Heparina + Gel)"
        YELLOW = "amarelo", "Amarelo (ACD)"
        ORANGE = "laranja", "Laranja"
        BLACK = "preto", "Preto"
        WHITE = "branco", "Branco"
        TRANSPARENT = "transparente", "Transparente"
        BROWN = "castanho", "Castanho"
        PINK = "rosa", "Rosa"
        NONE = "nenhuma", "Sem tampa / Recipiente"

    class ConservationTemp(models.TextChoices):
        AMBIENT = "AMBIENTE", "Temperatura ambiente (15–25 °C)"
        COLD = "REFRIGERADO", "Refrigerado (2–8 °C)"
        FROZEN = "CONGELADO", "Congelado (−20 °C)"
        ULTRA_COLD = "ULTRA_FRIO", "Ultracongelado (−70/−80 °C)"
        FRESH = "FRESCO", "Fresco — não refrigerar"
        INCUBATOR = "ESTUFA", "Estufa (35–37 °C)"

    code = models.CharField("Código", db_column="code", max_length=30, db_index=True)
    cap_color = models.CharField(
        "Cor da tampa",
        db_column="cap_color",
        max_length=20,
        choices=CapColor.choices,
        default=CapColor.TRANSPARENT,
    )
    additive = models.CharField(
        "Aditivo / Conservante",
        db_column="additive",
        max_length=200,
        blank=True,
        default="",
        help_text="Ex.: EDTA K3, Citrato de sódio 3,2 %, Fluoreto de sódio + Oxalato",
    )
    specimen_yields = models.CharField(
        "Amostra produzida",
        db_column="specimen_yields",
        max_length=120,
        blank=True,
        default="",
        help_text="Ex.: Soro, Plasma heparinizado, Sangue total, Urina",
    )
    volume_ml = models.DecimalField(
        "Volume a coletar (mL)",
        db_column="volume_ml",
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
    )
    inversions = models.PositiveSmallIntegerField(
        "Número de inversões",
        db_column="inversions",
        default=0,
        help_text="Inversões suaves imediatamente após a coleta para homogeneizar o aditivo.",
    )
    conservation_temperature = models.CharField(
        "Temperatura de conservação",
        db_column="conservation_temperature",
        max_length=15,
        choices=ConservationTemp.choices,
        default=ConservationTemp.AMBIENT,
    )
    conservation_max_hours = models.PositiveSmallIntegerField(
        "Estabilidade máxima (h)",
        db_column="conservation_max_hours",
        null=True,
        blank=True,
        help_text="Horas máximas entre coleta e análise nas condições de conservação indicadas.",
    )
    notes = models.TextField(
        "Observações / Instruções",
        db_column="notes",
        blank=True,
        default="",
        help_text="Instruções especiais de preparo, manuseio ou transporte.",
    )
    active = models.BooleanField("Ativo", db_column="active", default=True, db_index=True)

    class Meta:
        db_table = "laboratorio_tipo_recipiente"
        verbose_name = "Tipo de tubo/recipiente"
        verbose_name_plural = "Tipos de tubo/recipiente"
        ordering = ["name"]
        indexes = [models.Index(fields=["tenant", "active"])]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "code"],
                condition=models.Q(deleted=False),
                name="uniq_lab_container_code",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.code})" if self.code else self.name


class LabTest(CoreModel):
    """Exame laboratorial no catálogo (técnico + financeiro)."""

    prefix = "LTST"
    name_preserve_case = True

    code = models.CharField("Código", db_column="code", max_length=30, db_index=True)
    sector = models.ForeignKey(LabSector, db_column="sector_id", verbose_name="Sector",
                               on_delete=models.PROTECT, related_name="tests")
    sample_type = models.CharField("Tipo de amostra", db_column="sample_type", max_length=14,
                                   choices=SampleType.choices, default=SampleType.SERUM)
    container_type = models.ForeignKey(
        LabContainerType,
        db_column="container_type_id",
        verbose_name="Tipo de tubo/recipiente",
        on_delete=models.SET_NULL,
        related_name="tests",
        null=True,
        blank=True,
    )
    method = models.CharField("Método", db_column="method", max_length=120, blank=True, default="",
                              choices=LabMethod.choices)
    unit = models.CharField("Unidade", db_column="unit", max_length=30, blank=True, default="")
    reference_range = models.CharField("Intervalo de referência", db_column="reference_range",
                                       max_length=160, blank=True, default="")
    # Limiares numéricos para exames de valor único (sem campos/analitos). Quando
    # preenchidos, o flag do resultado é determinado automaticamente e os críticos
    # passam para a página de resultados críticos. Exames com vários analitos
    # devem antes definir os limiares por ``LabTestField`` (ExameCampo).
    reference_low = models.DecimalField("Limite inferior de referência", db_column="reference_low",
                                        max_digits=18, decimal_places=4, null=True, blank=True)
    reference_high = models.DecimalField("Limite superior de referência", db_column="reference_high",
                                         max_digits=18, decimal_places=4, null=True, blank=True)
    critical_low = models.DecimalField("Limite crítico inferior (pânico)", db_column="critical_low",
                                       max_digits=18, decimal_places=4, null=True, blank=True)
    critical_high = models.DecimalField("Limite crítico superior (pânico)", db_column="critical_high",
                                        max_digits=18, decimal_places=4, null=True, blank=True)
    price = MoneyField("Preço", default=Decimal("0.00"))
    turnaround_hours = models.PositiveIntegerField("Tempo de resposta (h)", db_column="turnaround_hours",
                                                   default=24)
    requires_fasting = models.BooleanField("Exige jejum", db_column="requires_fasting", default=False)
    requires_consent = models.BooleanField("Exige consentimento", db_column="requires_consent", default=False)
    active = models.BooleanField("Ativo", db_column="active", default=True, db_index=True)

    class Meta:
        db_table = "laboratorio_exame"
        verbose_name = "Exame laboratorial"
        verbose_name_plural = "Exames laboratoriais"
        ordering = ["name"]
        indexes = [models.Index(fields=["tenant", "sector", "active"])]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "code"], condition=models.Q(deleted=False),
                                    name="uniq_lab_test_code"),
        ]

    def __str__(self) -> str:
        return f"{self.code} - {self.name}" if self.name else self.code

    def activate(self):
        """Disponibiliza o exame no catálogo (§41.6/§39.8)."""
        self.active = True
        self.save(update_fields=["active", "updated_at"])
        return self

    def deactivate(self):
        """Suspende o exame — deixa de poder ser solicitado/faturado."""
        self.active = False
        self.save(update_fields=["active", "updated_at"])
        return self


class LabTestField(CoreModel):
    """Campo/analito de um exame (ex.: Hemoglobina, Leucócitos num hemograma).

    Permite que um único exame produza vários resultados, cada um com a sua
    unidade, intervalo de referência e limiares próprios. Os limiares definidos
    aqui tornam o tratamento de resultados críticos intuitivo: ao introduzir um
    valor para o campo, o flag (normal/baixo/alto/crítico) é determinado
    automaticamente e os críticos passam para a página de resultados críticos.
    """

    prefix = "LTSF"
    name_preserve_case = True

    class ResultType(models.TextChoices):
        NUMERO = "numero", "Número"
        TEXTO = "texto", "Texto livre"
        TEXTO_CHOICE = "texto_choice", "Escolha (lista)"

    test = models.ForeignKey(LabTest, db_column="test_id", verbose_name="Exame",
                             on_delete=models.CASCADE, related_name="fields")
    code = models.CharField("Código", db_column="code", max_length=30, blank=True, default="")
    unit = models.CharField("Unidade", db_column="unit", max_length=30,
                            choices=DefaultUnit.choices, blank=True, default="")
    result_type = models.CharField("Tipo de resultado", db_column="result_type", max_length=15,
                                   choices=ResultType.choices, default=ResultType.NUMERO)
    result_choices = models.JSONField("Opções de resultado", db_column="result_choices",
                                      default=list, blank=True)
    reference_range = models.CharField("Intervalo de referência", db_column="reference_range",
                                       max_length=160, blank=True, default="")
    reference_low = models.DecimalField("Limite inferior de referência", db_column="reference_low",
                                        max_digits=18, decimal_places=4, null=True, blank=True)
    reference_high = models.DecimalField("Limite superior de referência", db_column="reference_high",
                                         max_digits=18, decimal_places=4, null=True, blank=True)
    critical_low = models.DecimalField("Limite crítico inferior (pânico)", db_column="critical_low",
                                       max_digits=18, decimal_places=4, null=True, blank=True)
    critical_high = models.DecimalField("Limite crítico superior (pânico)", db_column="critical_high",
                                        max_digits=18, decimal_places=4, null=True, blank=True)
    sequence = models.PositiveIntegerField("Ordem", db_column="sequence", default=0)
    active = models.BooleanField("Ativo", db_column="active", default=True, db_index=True)

    class Meta:
        db_table = "laboratorio_exame_campo"
        verbose_name = "Campo de exame"
        verbose_name_plural = "Campos de exame"
        ordering = ["test", "sequence", "name"]
        indexes = [models.Index(fields=["tenant", "test", "active"])]

    def __str__(self) -> str:
        return f"{self.name or self.code}".strip() or f"Campo {self.pk}"

    def activate(self):
        """Disponibiliza o campo do exame."""
        self.active = True
        self.save(update_fields=["active", "updated_at"])
        return self

    def deactivate(self):
        """Suspende o campo do exame."""
        self.active = False
        self.save(update_fields=["active", "updated_at"])
        return self

    def interpret_result(self, value):
        """Flag do resultado numérico a partir das faixas inline do campo.

        Devolve "↓↓"/"↑↑" (crítico), "↓"/"↑" (fora de referência) ou "N"
        (normal); None quando não há valor ou não é numérico.
        """
        if value is None:
            return None
        from decimal import Decimal

        try:
            value = Decimal(value)
        except Exception:
            return None

        if self.critical_low is not None and value < self.critical_low:
            return "↓↓"
        if self.critical_high is not None and value > self.critical_high:
            return "↑↑"
        if self.reference_low is not None and value < self.reference_low:
            return "↓"
        if self.reference_high is not None and value > self.reference_high:
            return "↑"
        return "N"


class LabTestPanel(CoreModel):
    """Painel/pacote de exames (hemograma, perfil lipídico, pré-operatório, ...).

    Também representa perfis ocupacionais (saúde no trabalho): um perfil é um
    painel com ``profile_type=OCCUPATIONAL`` e a função/tipo de trabalho em
    ``occupation``, agrupando os exames do catálogo exigidos para essa função.
    """

    prefix = "LPAN"

    class ProfileType(models.TextChoices):
        STANDARD = "standard", "Painel padrão"
        OCCUPATIONAL = "occupational", "Perfil ocupacional"

    code = models.CharField("Código", db_column="code", max_length=30, db_index=True)
    sector = models.ForeignKey(LabSector, db_column="sector_id", verbose_name="Sector",
                               on_delete=models.PROTECT, related_name="panels", null=True, blank=True)
    tests = models.ManyToManyField(LabTest, db_table="laboratorio_painel_exames",
                                   verbose_name="Exames incluídos", related_name="panels", blank=True)
    package_price = MoneyField("Preço do pacote", default=Decimal("0.00"))
    profile_type = models.CharField("Tipo de perfil", db_column="profile_type", max_length=20,
                                    choices=ProfileType.choices, default=ProfileType.STANDARD,
                                    db_index=True)
    occupation = models.CharField("Função / tipo de trabalho", db_column="occupation",
                                  max_length=120, blank=True, default="")
    active = models.BooleanField("Ativo", db_column="active", default=True, db_index=True)

    class Meta:
        db_table = "laboratorio_painel"
        verbose_name = "Painel de exames"
        verbose_name_plural = "Painéis de exames"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name or self.code

    def activate(self):
        """Disponibiliza o painel/pacote no catálogo (§41.23)."""
        self.active = True
        self.save(update_fields=["active", "updated_at"])
        return self

    def deactivate(self):
        """Suspende o painel/pacote — deixa de poder ser solicitado/faturado."""
        self.active = False
        self.save(update_fields=["active", "updated_at"])
        return self


# =====================================================================
# PEDIDO
# =====================================================================
class LabOrder(NoNameCoreModel):
    """Pedido laboratorial de um paciente (consulta, urgência, internamento, ...)."""

    prefix = "LORD"

    class Status(models.TextChoices):
        DRAFT = "RASCUNHO", "Rascunho"
        REQUESTED = "SOLICITADO", "Solicitado"
        PENDING_PAYMENT = "AGUARDA_PAGAMENTO", "Aguarda pagamento"
        AUTHORIZED = "AUTORIZADO", "Autorizado"
        COLLECTED = "COLHIDO", "Colhido"
        IN_LAB = "NO_LABORATORIO", "No laboratório"
        IN_PROGRESS = "EM_PROCESSAMENTO", "Em processamento"
        REPORTED = "LAUDADO", "Laudado"
        DELIVERED = "ENTREGUE", "Entregue"
        CANCELLED = "CANCELADO", "Cancelado"

    class PaymentStatus(models.TextChoices):
        PENDING = "PENDENTE", "Pendente"
        AUTHORIZED = "AUTORIZADO", "Autorizado (seguro)"
        PAID = "PAGO", "Pago"
        EXEMPT = "ISENTO", "Isento"

    patient = models.ForeignKey("clinical.Patient", db_column="patient_id", verbose_name="Paciente",
                                on_delete=models.PROTECT, related_name="lab_orders")
    requesting_physician = models.ForeignKey(USER, db_column="requesting_physician_id",
                                             verbose_name="Médico solicitante", on_delete=models.PROTECT,
                                             related_name="+", null=True, blank=True)
    requesting_company = models.ForeignKey("entidades.Company", db_column="requesting_company_id",
                                           verbose_name="Companhia solicitante", on_delete=models.PROTECT,
                                           related_name="+", null=True, blank=True)
    origin = models.CharField("Origem", db_column="origin", max_length=40, blank=True, default="",
                              help_text="Consulta, urgência, internamento, cirurgia, externo, etc.")
    priority = models.CharField("Prioridade", db_column="priority", max_length=10,
                                choices=LabPriority.choices, default=LabPriority.ROUTINE, db_index=True)
    clinical_indication = models.TextField("Indicação clínica", db_column="clinical_indication",
                                           blank=True, default="")
    diagnosis = models.CharField("Diagnóstico/hipótese", db_column="diagnosis", max_length=255,
                                 blank=True, default="")
    status = models.CharField("Estado", max_length=20, choices=Status.choices,
                              default=Status.REQUESTED, db_index=True)
    payment_status = models.CharField("Estado de pagamento", db_column="payment_status", max_length=12,
                                      choices=PaymentStatus.choices, default=PaymentStatus.PENDING, db_index=True)
    requested_at = models.DateTimeField("Solicitado em", db_column="requested_at", default=timezone.now)

    class Meta:
        db_table = "laboratorio_pedido"
        verbose_name = "Pedido laboratorial"
        verbose_name_plural = "Pedidos laboratoriais"
        ordering = ["-requested_at"]
        indexes = [
            models.Index(fields=["tenant", "status", "priority"]),
            models.Index(fields=["tenant", "patient", "requested_at"]),
        ]

    @property
    def is_urgent(self) -> bool:
        return self.priority in (LabPriority.STAT, LabPriority.URGENT)

    def authorize(self):
        self.payment_status = self.PaymentStatus.AUTHORIZED
        if self.status in (self.Status.REQUESTED, self.Status.PENDING_PAYMENT):
            self.status = self.Status.AUTHORIZED
        self.save(update_fields=["payment_status", "status"])

    def cancel(self):
        self.status = self.Status.CANCELLED
        self.save(update_fields=["status"])

    def can_collect(self) -> bool:
        """Eletivo só colhe se pago/autorizado/isento; urgente pode colher antes."""
        if self.is_urgent:
            return True
        return self.payment_status in (self.PaymentStatus.AUTHORIZED, self.PaymentStatus.PAID,
                                       self.PaymentStatus.EXEMPT)

    def __str__(self) -> str:
        return f"{self.custom_id or self.pk} ({self.get_status_display()})"


class LabOrderItem(NoNameCoreModel):
    """Exame individual dentro de um pedido."""

    prefix = "LOIT"

    class Status(models.TextChoices):
        REQUESTED = "SOLICITADO", "Solicitado"
        PENDING_COLLECTION = "AGUARDA_COLHEITA", "Aguarda colheita"
        COLLECTED = "COLHIDO", "Colhido"
        RECEIVED = "RECEBIDO", "Recebido"
        IN_PROGRESS = "EM_PROCESSAMENTO", "Em processamento"
        RESULT_ENTERED = "RESULTADO_INSERIDO", "Resultado inserido"
        VALIDATED = "VALIDADO", "Validado"
        REPORTED = "LAUDADO", "Laudado"
        CANCELLED = "CANCELADO", "Cancelado"

    order = models.ForeignKey(LabOrder, db_column="order_id", verbose_name="Pedido",
                              on_delete=models.CASCADE, related_name="items")
    test = models.ForeignKey(LabTest, db_column="test_id", verbose_name="Exame",
                             on_delete=models.PROTECT, related_name="order_items")
    sample_type = models.CharField("Tipo de amostra", db_column="sample_type", max_length=14,
                                   choices=SampleType.choices, default=SampleType.SERUM)
    price = MoneyField("Preço", default=Decimal("0.00"))
    status = models.CharField("Estado", max_length=20, choices=Status.choices,
                              default=Status.REQUESTED, db_index=True)
    billed = models.BooleanField("Faturado", db_column="billed", default=False)

    class Meta:
        db_table = "laboratorio_pedido_item"
        verbose_name = "Item de pedido laboratorial"
        verbose_name_plural = "Itens de pedido laboratorial"
        ordering = ["id"]
        indexes = [models.Index(fields=["tenant", "order", "status"])]

    def __str__(self) -> str:
        return f"{self.order_id}:{self.test_id} ({self.get_status_display()})"


# =====================================================================
# COLHEITA / AMOSTRA (PRÉ-ANALÍTICO)
# =====================================================================
class SampleCollection(NoNameCoreModel):
    """Colheita da amostra biológica do paciente."""

    prefix = "LCOL"

    class Status(models.TextChoices):
        PENDING = "PENDENTE", "Pendente"
        COLLECTED = "COLHIDA", "Colhida"
        FAILED = "FALHADA", "Falhou"
        SENT = "ENVIADA", "Enviada ao laboratório"
        CANCELLED = "CANCELADA", "Cancelada"

    order = models.ForeignKey(LabOrder, db_column="order_id", verbose_name="Pedido",
                              on_delete=models.CASCADE, related_name="collections")
    patient = models.ForeignKey("clinical.Patient", db_column="patient_id", verbose_name="Paciente",
                                on_delete=models.PROTECT, related_name="lab_collections")
    collected_by = models.ForeignKey(USER, db_column="collected_by_id", verbose_name="Colhido por",
                                     on_delete=models.PROTECT, related_name="+", null=True, blank=True)
    collection_at = models.DateTimeField("Colhida em", db_column="collection_at", null=True, blank=True)
    location = models.CharField("Local de colheita", db_column="location", max_length=120, blank=True, default="")
    sample_type = models.CharField("Tipo de amostra", db_column="sample_type", max_length=14,
                                   choices=SampleType.choices, default=SampleType.SERUM)
    container_type = models.CharField("Tipo de tubo/recipiente", db_column="container_type",
                                      max_length=80, blank=True, default="")
    barcode = models.CharField("Código de barras", db_column="barcode", max_length=60, blank=True,
                               default="", db_index=True)
    status = models.CharField("Estado", max_length=10, choices=Status.choices,
                              default=Status.PENDING, db_index=True)
    notes = models.TextField("Observações", db_column="notes", blank=True, default="")

    class Meta:
        db_table = "laboratorio_colheita"
        verbose_name = "Colheita de amostra"
        verbose_name_plural = "Colheitas de amostras"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["tenant", "status"]), models.Index(fields=["barcode"])]

    def mark_collected(self, *, by=None, when=None):
        self.status = self.Status.COLLECTED
        self.collected_by = by or self.collected_by
        self.collection_at = when or timezone.now()
        self.save(update_fields=["status", "collected_by", "collection_at"])

    def send_to_lab(self):
        self.status = self.Status.SENT
        self.save(update_fields=["status"])

    def mark_failed(self):
        self.status = self.Status.FAILED
        self.save(update_fields=["status"])

    def __str__(self) -> str:
        return f"{self.custom_id or self.pk} ({self.get_status_display()})"


class LabSample(NoNameCoreModel):
    """Amostra física rastreável no laboratório (código de barras é a âncora)."""

    prefix = "LSAM"

    class Condition(models.TextChoices):
        ADEQUATE = "ADEQUADA", "Adequada"
        HEMOLYZED = "HEMOLISADA", "Hemolisada"
        CLOTTED = "COAGULADA", "Coagulada"
        INSUFFICIENT = "VOLUME_INSUF", "Volume insuficiente"
        LEAKING = "VAZADA", "Vazada"
        WRONG_CONTAINER = "TUBO_ERRADO", "Tubo errado"
        UNLABELED = "SEM_ID", "Sem identificação"
        CONTAMINATED = "CONTAMINADA", "Contaminada"

    class Status(models.TextChoices):
        COLLECTED = "COLHIDA", "Colhida"
        IN_TRANSIT = "EM_TRANSITO", "Em trânsito"
        RECEIVED = "RECEBIDA", "Recebida"
        ACCEPTED = "ACEITE", "Aceite"
        REJECTED = "REJEITADA", "Rejeitada"
        IN_PROCESSING = "EM_PROCESSAMENTO", "Em processamento"
        PROCESSED = "PROCESSADA", "Processada"
        STORED = "ARMAZENADA", "Armazenada"
        DISPOSED = "DESCARTADA", "Descartada"

    order = models.ForeignKey(LabOrder, db_column="order_id", verbose_name="Pedido",
                              on_delete=models.CASCADE, related_name="samples")
    collection = models.ForeignKey(SampleCollection, db_column="collection_id", verbose_name="Colheita",
                                   on_delete=models.SET_NULL, related_name="samples", null=True, blank=True)
    barcode = models.CharField("Código de barras", db_column="barcode", max_length=60, db_index=True)
    sample_type = models.CharField("Tipo de amostra", db_column="sample_type", max_length=14,
                                   choices=SampleType.choices, default=SampleType.SERUM)
    container_type = models.CharField("Tipo de tubo/recipiente", db_column="container_type",
                                      max_length=80, blank=True, default="")
    condition = models.CharField("Condição", db_column="condition", max_length=14,
                                 choices=Condition.choices, default=Condition.ADEQUATE)
    status = models.CharField("Estado", max_length=18, choices=Status.choices,
                              default=Status.COLLECTED, db_index=True)
    collected_at = models.DateTimeField("Colhida em", db_column="collected_at", null=True, blank=True)
    received_at = models.DateTimeField("Recebida em", db_column="received_at", null=True, blank=True)
    storage_location = models.CharField("Localização de armazenamento", db_column="storage_location",
                                        max_length=120, blank=True, default="")

    class Meta:
        db_table = "laboratorio_amostra"
        verbose_name = "Amostra laboratorial"
        verbose_name_plural = "Amostras laboratoriais"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["tenant", "status"]), models.Index(fields=["barcode"])]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "barcode"], condition=models.Q(deleted=False),
                                    name="uniq_lab_sample_barcode"),
        ]

    def receive(self, *, when=None):
        self.status = self.Status.RECEIVED
        self.received_at = when or timezone.now()
        self.save(update_fields=["status", "received_at"])

    def accept(self):
        self.status = self.Status.ACCEPTED
        self.save(update_fields=["status"])

    def reject(self):
        self.status = self.Status.REJECTED
        self.save(update_fields=["status"])

    def __str__(self) -> str:
        return f"{self.barcode} ({self.get_status_display()})"


class SampleReception(NoNameCoreModel):
    """Recepção e conferência da amostra no laboratório."""

    prefix = "LREC"

    sample = models.ForeignKey(LabSample, db_column="sample_id", verbose_name="Amostra",
                               on_delete=models.CASCADE, related_name="receptions")
    received_by = models.ForeignKey(USER, db_column="received_by_id", verbose_name="Recebido por",
                                    on_delete=models.PROTECT, related_name="+", null=True, blank=True)
    received_at = models.DateTimeField("Recebida em", db_column="received_at", default=timezone.now)
    condition = models.CharField("Condição na recepção", db_column="condition", max_length=14,
                                 choices=LabSample.Condition.choices, default=LabSample.Condition.ADEQUATE)
    accepted = models.BooleanField("Aceite", db_column="accepted", default=True, db_index=True)
    notes = models.TextField("Observações", db_column="notes", blank=True, default="")

    class Meta:
        db_table = "laboratorio_recepcao"
        verbose_name = "Recepção de amostra"
        verbose_name_plural = "Recepções de amostras"
        ordering = ["-received_at"]

    def __str__(self) -> str:
        return f"{self.sample_id} ({'aceite' if self.accepted else 'rejeitada'})"


class SampleRejection(NoNameCoreModel):
    """Rejeição de amostra inadequada para análise."""

    prefix = "LREJ"

    class Reason(models.TextChoices):
        HEMOLYZED = "HEMOLISE", "Amostra hemolisada"
        CLOTTED = "COAGULO", "Amostra coagulada"
        INSUFFICIENT = "VOLUME", "Volume insuficiente"
        WRONG_CONTAINER = "TUBO", "Tubo errado"
        UNLABELED = "SEM_ID", "Sem identificação"
        LEAKING = "VAZAMENTO", "Amostra vazada"
        TRANSPORT = "TRANSPORTE", "Tempo de transporte excedido"
        CONTAMINATED = "CONTAMINACAO", "Amostra contaminada"
        INCOMPATIBLE = "INCOMPATIVEL", "Pedido incompatível"

    sample = models.ForeignKey(LabSample, db_column="sample_id", verbose_name="Amostra",
                               on_delete=models.CASCADE, related_name="rejections")
    rejected_by = models.ForeignKey(USER, db_column="rejected_by_id", verbose_name="Rejeitado por",
                                    on_delete=models.PROTECT, related_name="+", null=True, blank=True)
    reason = models.CharField("Motivo", db_column="reason", max_length=14, choices=Reason.choices)
    details = models.TextField("Detalhes", db_column="details", blank=True, default="")
    requires_recollection = models.BooleanField("Exige nova colheita", db_column="requires_recollection",
                                                default=True)
    rejected_at = models.DateTimeField("Rejeitada em", db_column="rejected_at", default=timezone.now)

    class Meta:
        db_table = "laboratorio_rejeicao"
        verbose_name = "Rejeição de amostra"
        verbose_name_plural = "Rejeições de amostras"
        ordering = ["-rejected_at"]

    def __str__(self) -> str:
        return f"{self.sample_id}: {self.get_reason_display()}"


# =====================================================================
# PROCESSAMENTO (ANALÍTICO)
# =====================================================================
class LabWorklist(NoNameCoreModel):
    """Lista de trabalho por sector/equipamento."""

    prefix = "LWKL"

    class Status(models.TextChoices):
        OPEN = "ABERTA", "Aberta"
        IN_PROGRESS = "EM_CURSO", "Em curso"
        CLOSED = "FECHADA", "Fechada"

    sector = models.ForeignKey(LabSector, db_column="sector_id", verbose_name="Sector",
                               on_delete=models.PROTECT, related_name="worklists")
    work_date = models.DateField("Data", db_column="work_date", default=timezone.localdate, db_index=True)
    priority = models.CharField("Prioridade", db_column="priority", max_length=10,
                                choices=LabPriority.choices, default=LabPriority.ROUTINE)
    assigned_to = models.ForeignKey(USER, db_column="assigned_to_id", verbose_name="Técnico responsável",
                                    on_delete=models.PROTECT, related_name="+", null=True, blank=True)
    status = models.CharField("Estado", max_length=10, choices=Status.choices,
                              default=Status.OPEN, db_index=True)

    class Meta:
        db_table = "laboratorio_worklist"
        verbose_name = "Lista de trabalho"
        verbose_name_plural = "Listas de trabalho"
        ordering = ["-work_date"]
        indexes = [models.Index(fields=["tenant", "sector", "status"])]

    def __str__(self) -> str:
        return f"{self.sector_id} - {self.work_date} ({self.get_status_display()})"


class LabResult(NoNameCoreModel):
    """Resultado técnico de um exame."""

    prefix = "LRES"

    class Flag(models.TextChoices):
        NORMAL = "NORMAL", "Normal"
        LOW = "BAIXO", "Baixo"
        HIGH = "ALTO", "Alto"
        CRITICAL_LOW = "CRITICO_BAIXO", "Crítico baixo"
        CRITICAL_HIGH = "CRITICO_ALTO", "Crítico alto"
        POSITIVE = "POSITIVO", "Positivo"
        NEGATIVE = "NEGATIVO", "Negativo"
        REACTIVE = "REAGENTE", "Reagente"
        NON_REACTIVE = "NAO_REAGENTE", "Não reagente"
        INDETERMINATE = "INDETERMINADO", "Indeterminado"

    class Status(models.TextChoices):
        PENDING = "PENDENTE", "Pendente"
        ENTERED = "INSERIDO", "Inserido"
        PRELIMINARY = "PRELIMINAR", "Preliminar"
        VALIDATED = "VALIDADO", "Validado"
        REJECTED = "REJEITADO", "Rejeitado"
        CORRECTED = "CORRIGIDO", "Corrigido"
        FINAL = "FINAL", "Final"

    order_item = models.ForeignKey(LabOrderItem, db_column="order_item_id", verbose_name="Item do pedido",
                                   on_delete=models.CASCADE, related_name="results")
    test_field = models.ForeignKey(LabTestField, db_column="test_field_id", verbose_name="Campo de exame",
                                   on_delete=models.SET_NULL, related_name="results", null=True, blank=True)
    sample = models.ForeignKey(LabSample, db_column="sample_id", verbose_name="Amostra",
                               on_delete=models.SET_NULL, related_name="results", null=True, blank=True)
    value = models.CharField("Resultado", db_column="value", max_length=255, blank=True, default="")
    numeric_value = models.DecimalField("Valor numérico", db_column="numeric_value", max_digits=18,
                                        decimal_places=4, null=True, blank=True)
    unit = models.CharField("Unidade", db_column="unit", max_length=30, blank=True, default="")
    reference_range = models.CharField("Intervalo de referência", db_column="reference_range",
                                       max_length=160, blank=True, default="")
    flag = models.CharField("Flag", db_column="flag", max_length=14, choices=Flag.choices,
                            default=Flag.NORMAL, db_index=True)
    method = models.CharField("Método", db_column="method", max_length=120, blank=True, default="")
    equipment = models.CharField("Equipamento", db_column="equipment", max_length=120, blank=True, default="")
    performed_by = models.ForeignKey(USER, db_column="performed_by_id", verbose_name="Executado por",
                                     on_delete=models.PROTECT, related_name="+", null=True, blank=True)
    performed_at = models.DateTimeField("Executado em", db_column="performed_at", null=True, blank=True)
    status = models.CharField("Estado", max_length=12, choices=Status.choices,
                              default=Status.PENDING, db_index=True)
    comment = models.TextField("Comentário técnico", db_column="comment", blank=True, default="")

    class Meta:
        db_table = "laboratorio_resultado"
        verbose_name = "Resultado laboratorial"
        verbose_name_plural = "Resultados laboratoriais"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "flag"]),
        ]

    @property
    def is_critical(self) -> bool:
        return self.flag in (self.Flag.CRITICAL_LOW, self.Flag.CRITICAL_HIGH)

    @property
    def order(self):
        """Requisição (pedido) a que este resultado pertence."""
        return self.order_item.order if self.order_item_id else None

    @staticmethod
    def coerce_numeric(value):
        """Converte um valor introduzido para Decimal (aceita vírgula decimal)."""
        if value in (None, ""):
            return None
        try:
            return Decimal(str(value).strip().replace(",", "."))
        except (InvalidOperation, ValueError):
            return None

    def _catalog_source(self):
        """Origem dos metadados do catálogo: o campo (ExameCampo) ou, em falta, o exame."""
        source = self.test_field
        if source is None and self.order_item_id:
            source = getattr(self.order_item, "test", None)
        return source

    def _thresholds(self):
        """Limiares (ref_low, ref_high, crit_low, crit_high): campo tem prioridade."""
        source = self._catalog_source()
        if source is None:
            return (None, None, None, None)
        return (source.reference_low, source.reference_high,
                source.critical_low, source.critical_high)

    def inherit_catalog_metadata(self):
        """Herda unidade/intervalo de referência do campo/exame quando vazios.

        Mantém o resultado autossuficiente para apresentação (ex.: "520 mg/dL"
        na página de críticos) sem sobrescrever valores já preenchidos.
        """
        source = self._catalog_source()
        changed = []
        if source is None:
            return changed
        if not self.unit and getattr(source, "unit", ""):
            self.unit = source.unit
            changed.append("unit")
        if not self.reference_range and getattr(source, "reference_range", ""):
            self.reference_range = source.reference_range
            changed.append("reference_range")
        return changed

    def compute_flag(self, numeric_value=None):
        """Determina o flag a partir do valor numérico e dos limiares do campo/exame.

        Resultados qualitativos (sem valor numérico) ou exames sem limiares
        mantêm o flag atual — não sobrescreve flags como POSITIVO/REAGENTE.
        """
        value = numeric_value if numeric_value is not None else self.numeric_value
        if value is None:
            return self.flag
        ref_low, ref_high, crit_low, crit_high = self._thresholds()
        if crit_low is not None and value < crit_low:
            return self.Flag.CRITICAL_LOW
        if crit_high is not None and value > crit_high:
            return self.Flag.CRITICAL_HIGH
        if ref_low is not None and value < ref_low:
            return self.Flag.LOW
        if ref_high is not None and value > ref_high:
            return self.Flag.HIGH
        if any(t is not None for t in (ref_low, ref_high, crit_low, crit_high)):
            return self.Flag.NORMAL
        return self.flag

    def enter_result(self, *, value, by=None):
        self.value = str(value)
        numeric = self.coerce_numeric(value)
        if numeric is not None:
            self.numeric_value = numeric
        self.inherit_catalog_metadata()
        self.flag = self.compute_flag()
        self.status = self.Status.ENTERED
        self.performed_by = by or self.performed_by
        self.performed_at = self.performed_at or timezone.now()
        self.save(update_fields=["value", "numeric_value", "unit", "reference_range",
                                 "flag", "status", "performed_by", "performed_at"])

    def mark_validated(self):
        self.status = self.Status.VALIDATED
        self.save(update_fields=["status"])

    def __str__(self) -> str:
        return f"{self.order_item_id}: {self.value} ({self.get_status_display()})"


class ResultValidation(NoNameCoreModel):
    """Validação técnica ou clínica de um resultado."""

    prefix = "LVAL"

    class ValidationType(models.TextChoices):
        TECHNICAL = "TECNICA", "Validação técnica"
        CLINICAL = "CLINICA", "Validação clínica"

    class Status(models.TextChoices):
        PENDING = "PENDENTE", "Pendente"
        APPROVED = "APROVADA", "Aprovada"
        REJECTED = "REJEITADA", "Rejeitada"
        REQUIRES_REPEAT = "REPETIR", "Requer repetição"
        REQUIRES_REVIEW = "REVISAO", "Requer revisão"

    result = models.ForeignKey(LabResult, db_column="result_id", verbose_name="Resultado",
                               on_delete=models.CASCADE, related_name="validations")
    validation_type = models.CharField("Tipo", db_column="validation_type", max_length=8,
                                       choices=ValidationType.choices, default=ValidationType.TECHNICAL)
    validated_by = models.ForeignKey(USER, db_column="validated_by_id", verbose_name="Validado por",
                                     on_delete=models.PROTECT, related_name="+", null=True, blank=True)
    status = models.CharField("Estado", max_length=10, choices=Status.choices,
                              default=Status.PENDING, db_index=True)
    notes = models.TextField("Notas", db_column="notes", blank=True, default="")
    validated_at = models.DateTimeField("Validado em", db_column="validated_at", null=True, blank=True)

    class Meta:
        db_table = "laboratorio_validacao"
        verbose_name = "Validação de resultado"
        verbose_name_plural = "Validações de resultados"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["tenant", "validation_type", "status"])]

    def approve(self, *, by=None):
        self.status = self.Status.APPROVED
        self.validated_by = by or self.validated_by
        self.validated_at = timezone.now()
        self.save(update_fields=["status", "validated_by", "validated_at"])
        if self.validation_type == self.ValidationType.CLINICAL:
            self.result.mark_validated()

    def __str__(self) -> str:
        return f"{self.result_id} - {self.get_validation_type_display()} ({self.get_status_display()})"


# =====================================================================
# PÓS-ANALÍTICO (LAUDO + CRÍTICO)
# =====================================================================
class LabReport(NoNameCoreModel):
    """Laudo laboratorial final com resultados validados."""

    prefix = "LREP"

    class Status(models.TextChoices):
        DRAFT = "RASCUNHO", "Rascunho"
        PARTIAL = "PARCIAL", "Parcialmente pronto"
        FINAL = "FINAL", "Final"
        SIGNED = "ASSINADO", "Assinado"
        DELIVERED = "ENTREGUE", "Entregue"
        CORRECTED = "CORRIGIDO", "Corrigido"
        CANCELLED = "CANCELADO", "Cancelado"

    order = models.ForeignKey(LabOrder, db_column="order_id", verbose_name="Pedido",
                              on_delete=models.PROTECT, related_name="reports")
    patient = models.ForeignKey("clinical.Patient", db_column="patient_id", verbose_name="Paciente",
                                on_delete=models.PROTECT, related_name="lab_reports")
    report_number = models.CharField("Número do laudo", db_column="report_number", max_length=40,
                                     blank=True, default="", db_index=True)
    status = models.CharField("Estado", max_length=10, choices=Status.choices,
                              default=Status.DRAFT, db_index=True)
    signed_by = models.ForeignKey(USER, db_column="signed_by_id", verbose_name="Assinado por",
                                  on_delete=models.PROTECT, related_name="+", null=True, blank=True)
    issued_at = models.DateTimeField("Emitido em", db_column="issued_at", null=True, blank=True)
    delivered_at = models.DateTimeField("Entregue em", db_column="delivered_at", null=True, blank=True)
    delivery_channel = models.CharField("Canal de entrega", db_column="delivery_channel", max_length=40,
                                        blank=True, default="")

    class Meta:
        db_table = "laboratorio_laudo"
        verbose_name = "Laudo laboratorial"
        verbose_name_plural = "Laudos laboratoriais"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["tenant", "status"]), models.Index(fields=["report_number"])]

    def sign(self, *, by=None):
        self.status = self.Status.SIGNED
        self.signed_by = by or self.signed_by
        self.issued_at = self.issued_at or timezone.now()
        if not self.report_number:
            self.report_number = f"LAUDO-{self.custom_id or self.pk}"
        self.save(update_fields=["status", "signed_by", "issued_at", "report_number"])

    def deliver(self, *, channel=""):
        self.status = self.Status.DELIVERED
        self.delivered_at = timezone.now()
        if channel:
            self.delivery_channel = channel
        self.save(update_fields=["status", "delivered_at", "delivery_channel"])

    def __str__(self) -> str:
        return f"{self.report_number or self.custom_id or self.pk} ({self.get_status_display()})"


class CriticalResultNotification(NoNameCoreModel):
    """Comunicação de resultado crítico ao profissional responsável (com readback)."""

    prefix = "LCRN"

    class Method(models.TextChoices):
        PHONE = "TELEFONE", "Telefone"
        SMS = "SMS", "SMS"
        IN_PERSON = "PRESENCIAL", "Presencial"
        SYSTEM = "SISTEMA", "Sistema/Notificação"
        EMAIL = "EMAIL", "E-mail"

    result = models.ForeignKey(LabResult, db_column="result_id", verbose_name="Resultado",
                               on_delete=models.CASCADE, related_name="critical_notifications")
    order = models.ForeignKey(LabOrder, db_column="order_id", verbose_name="Requisição",
                              on_delete=models.PROTECT, related_name="critical_notifications",
                              null=True, blank=True)
    patient = models.ForeignKey("clinical.Patient", db_column="patient_id", verbose_name="Paciente",
                                on_delete=models.PROTECT, related_name="lab_critical_notifications")
    notified_professional = models.CharField("Profissional notificado", db_column="notified_professional",
                                             max_length=160, blank=True, default="")
    method = models.CharField("Método", db_column="method", max_length=12, choices=Method.choices,
                              default=Method.PHONE)
    notified_by = models.ForeignKey(USER, db_column="notified_by_id", verbose_name="Notificado por",
                                    on_delete=models.PROTECT, related_name="+", null=True, blank=True)
    readback_confirmed = models.BooleanField("Readback confirmado", db_column="readback_confirmed",
                                             default=False)
    notified_at = models.DateTimeField("Notificado em", db_column="notified_at", default=timezone.now)
    notes = models.TextField("Notas", db_column="notes", blank=True, default="")

    class Meta:
        db_table = "laboratorio_resultado_critico"
        verbose_name = "Comunicação de resultado crítico"
        verbose_name_plural = "Comunicações de resultados críticos"
        ordering = ["-notified_at"]
        indexes = [models.Index(fields=["tenant", "readback_confirmed"])]

    def __str__(self) -> str:
        return f"Crítico {self.result_id} → {self.notified_professional or '—'}"


# =====================================================================
# SECTORES ESPECIALIZADOS
# =====================================================================
# Microbiologia: cultura → isolado → antibiograma.
class MicrobiologyCulture(NoNameCoreModel):
    """Cultura microbiológica a partir de uma amostra."""

    prefix = "LCUL"

    class CultureType(models.TextChoices):
        AEROBIC = "AEROBIA", "Aeróbia"
        ANAEROBIC = "ANAEROBIA", "Anaeróbia"
        FUNGAL = "FUNGICA", "Fúngica (micológica)"
        MYCOBACTERIAL = "MICOBACTERIA", "Micobacteriana (TB)"
        BLOOD = "HEMOCULTURA", "Hemocultura"
        URINE = "UROCULTURA", "Urocultura"
        OTHER = "OUTRA", "Outra"

    class Status(models.TextChoices):
        SETUP = "MONTADA", "Montada"
        INCUBATING = "INCUBACAO", "Em incubação"
        GROWTH = "CRESCIMENTO", "Crescimento detetado"
        NO_GROWTH = "SEM_CRESCIMENTO", "Sem crescimento"
        COMPLETED = "CONCLUIDA", "Concluída"

    order_item = models.ForeignKey(LabOrderItem, db_column="order_item_id", verbose_name="Item do pedido",
                                   on_delete=models.CASCADE, related_name="cultures")
    sample = models.ForeignKey(LabSample, db_column="sample_id", verbose_name="Amostra",
                               on_delete=models.SET_NULL, related_name="cultures", null=True, blank=True)
    culture_type = models.CharField("Tipo de cultura", db_column="culture_type", max_length=14,
                                    choices=CultureType.choices, default=CultureType.AEROBIC)
    specimen = models.CharField("Espécime", db_column="specimen", max_length=120, blank=True, default="")
    status = models.CharField("Estado", max_length=16, choices=Status.choices,
                              default=Status.SETUP, db_index=True)
    incubation_started_at = models.DateTimeField("Incubação iniciada em", db_column="incubation_started_at",
                                                 null=True, blank=True)
    read_at = models.DateTimeField("Leitura em", db_column="read_at", null=True, blank=True)
    performed_by = models.ForeignKey(USER, db_column="performed_by_id", verbose_name="Executado por",
                                     on_delete=models.PROTECT, related_name="+", null=True, blank=True)
    notes = models.TextField("Observações", db_column="notes", blank=True, default="")

    class Meta:
        db_table = "laboratorio_cultura"
        verbose_name = "Cultura microbiológica"
        verbose_name_plural = "Culturas microbiológicas"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["tenant", "status"])]

    def __str__(self) -> str:
        return f"{self.get_culture_type_display()} ({self.get_status_display()})"


class MicrobiologyIsolate(NoNameCoreModel):
    """Microrganismo isolado a partir de uma cultura."""

    prefix = "LISO"

    culture = models.ForeignKey(MicrobiologyCulture, db_column="culture_id", verbose_name="Cultura",
                                on_delete=models.CASCADE, related_name="isolates")
    organism_name = models.CharField("Microrganismo", db_column="organism_name", max_length=160)
    gram_stain = models.CharField("Coloração de Gram", db_column="gram_stain", max_length=60, blank=True, default="")
    quantity = models.CharField("Quantidade/contagem", db_column="quantity", max_length=60, blank=True, default="")
    is_significant = models.BooleanField("Significativo", db_column="is_significant", default=True)
    notes = models.TextField("Observações", db_column="notes", blank=True, default="")

    class Meta:
        db_table = "laboratorio_isolado"
        verbose_name = "Isolado microbiológico"
        verbose_name_plural = "Isolados microbiológicos"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["tenant", "culture"])]

    def __str__(self) -> str:
        return self.organism_name


class AntibioticSusceptibility(NoNameCoreModel):
    """Antibiograma: sensibilidade de um isolado a um antibiótico (S/I/R)."""

    prefix = "LAST"

    class Method(models.TextChoices):
        DISK = "DISCO", "Difusão em disco (Kirby-Bauer)"
        MIC = "CIM", "CIM (concentração inibitória mínima)"
        ETEST = "ETEST", "E-test"
        AUTOMATED = "AUTOMATIZADO", "Automatizado"

    class Result(models.TextChoices):
        SUSCEPTIBLE = "SENSIVEL", "Sensível (S)"
        INTERMEDIATE = "INTERMEDIO", "Intermédio (I)"
        RESISTANT = "RESISTENTE", "Resistente (R)"

    isolate = models.ForeignKey(MicrobiologyIsolate, db_column="isolate_id", verbose_name="Isolado",
                                on_delete=models.CASCADE, related_name="susceptibilities")
    antibiotic = models.CharField("Antibiótico", db_column="antibiotic", max_length=120)
    method = models.CharField("Método", db_column="method", max_length=14,
                              choices=Method.choices, default=Method.DISK)
    result = models.CharField("Resultado", db_column="result", max_length=12, choices=Result.choices)
    zone_mm = models.PositiveIntegerField("Halo (mm)", db_column="zone_mm", null=True, blank=True)
    mic_value = models.CharField("Valor CIM", db_column="mic_value", max_length=40, blank=True, default="")

    class Meta:
        db_table = "laboratorio_antibiograma"
        verbose_name = "Antibiograma"
        verbose_name_plural = "Antibiogramas"
        ordering = ["antibiotic"]
        indexes = [models.Index(fields=["tenant", "isolate"])]

    def __str__(self) -> str:
        return f"{self.antibiotic}: {self.get_result_display()}"


class MolecularResult(NoNameCoreModel):
    """Resultado de biologia molecular (PCR, carga viral, GeneXpert MTB/RIF, ...)."""

    prefix = "LMOL"

    class Assay(models.TextChoices):
        GENEXPERT_MTB_RIF = "GENEXPERT_MTB_RIF", "GeneXpert MTB/RIF"
        TB_PCR = "TB_PCR", "PCR TB"
        HIV_VIRAL_LOAD = "CV_HIV", "Carga viral HIV"
        HEPATITIS_VIRAL_LOAD = "CV_HEPATITE", "Carga viral hepatite"
        HPV_DNA = "HPV_DNA", "HPV DNA"
        COVID_PCR = "COVID_PCR", "PCR COVID-19"
        PCR_GENERIC = "PCR", "PCR (genérico)"
        OTHER = "OUTRO", "Outro"

    class Detection(models.TextChoices):
        DETECTED = "DETETADO", "Detetado"
        NOT_DETECTED = "NAO_DETETADO", "Não detetado"
        INDETERMINATE = "INDETERMINADO", "Indeterminado"
        INVALID = "INVALIDO", "Inválido"

    class RifResistance(models.TextChoices):
        NOT_APPLICABLE = "NA", "N/A"
        SENSITIVE = "SENSIVEL", "Sensível à rifampicina"
        RESISTANT = "RESISTENTE", "Resistente à rifampicina"
        INDETERMINATE = "INDETERMINADO", "Indeterminado"

    order_item = models.ForeignKey(LabOrderItem, db_column="order_item_id", verbose_name="Item do pedido",
                                   on_delete=models.CASCADE, related_name="molecular_results")
    sample = models.ForeignKey(LabSample, db_column="sample_id", verbose_name="Amostra",
                               on_delete=models.SET_NULL, related_name="molecular_results", null=True, blank=True)
    assay = models.CharField("Ensaio", db_column="assay", max_length=20, choices=Assay.choices,
                             default=Assay.PCR_GENERIC, db_index=True)
    detection = models.CharField("Deteção", db_column="detection", max_length=14,
                                 choices=Detection.choices, default=Detection.NOT_DETECTED, db_index=True)
    rif_resistance = models.CharField("Resistência à rifampicina (GeneXpert)", db_column="rif_resistance",
                                      max_length=14, choices=RifResistance.choices,
                                      default=RifResistance.NOT_APPLICABLE)
    quantitative_value = models.DecimalField("Valor quantitativo (ex.: cópias/mL)", db_column="quantitative_value",
                                             max_digits=20, decimal_places=2, null=True, blank=True)
    unit = models.CharField("Unidade", db_column="unit", max_length=30, blank=True, default="")
    ct_value = models.DecimalField("Ct", db_column="ct_value", max_digits=6, decimal_places=2,
                                   null=True, blank=True)
    instrument = models.CharField("Instrumento", db_column="instrument", max_length=120, blank=True, default="")
    performed_by = models.ForeignKey(USER, db_column="performed_by_id", verbose_name="Executado por",
                                     on_delete=models.PROTECT, related_name="+", null=True, blank=True)
    performed_at = models.DateTimeField("Executado em", db_column="performed_at", null=True, blank=True)
    notes = models.TextField("Interpretação", db_column="notes", blank=True, default="")

    class Meta:
        db_table = "laboratorio_molecular"
        verbose_name = "Resultado molecular"
        verbose_name_plural = "Resultados moleculares"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["tenant", "assay", "detection"])]

    def __str__(self) -> str:
        base = f"{self.get_assay_display()}: {self.get_detection_display()}"
        if self.assay == self.Assay.GENEXPERT_MTB_RIF and self.detection == self.Detection.DETECTED:
            base += f" / {self.get_rif_resistance_display()}"
        return base


class AcidFastSmear(NoNameCoreModel):
    """Baciloscopia (pesquisa de BAAR) — microscopia de esfregaço para TB."""

    prefix = "LAFB"

    class Stain(models.TextChoices):
        ZIEHL_NEELSEN = "ZN", "Ziehl-Neelsen"
        AURAMINE = "AURAMINA", "Auramina (fluorescência)"

    class Grade(models.TextChoices):
        NEGATIVE = "NEGATIVO", "Negativo"
        SCANTY = "RARO", "Raros bacilos (escasso)"
        ONE_PLUS = "1+", "1+"
        TWO_PLUS = "2+", "2+"
        THREE_PLUS = "3+", "3+"

    order_item = models.ForeignKey(LabOrderItem, db_column="order_item_id", verbose_name="Item do pedido",
                                   on_delete=models.CASCADE, related_name="afb_smears")
    sample = models.ForeignKey(LabSample, db_column="sample_id", verbose_name="Amostra",
                               on_delete=models.SET_NULL, related_name="afb_smears", null=True, blank=True)
    stain = models.CharField("Coloração", db_column="stain", max_length=10,
                             choices=Stain.choices, default=Stain.ZIEHL_NEELSEN)
    grade = models.CharField("Resultado (gradação)", db_column="grade", max_length=10,
                             choices=Grade.choices, default=Grade.NEGATIVE, db_index=True)
    afb_count = models.CharField("Contagem de BAAR", db_column="afb_count", max_length=60, blank=True, default="")
    serial_number = models.PositiveSmallIntegerField("Amostra seriada (1ª/2ª/3ª)", db_column="serial_number",
                                                     null=True, blank=True)
    performed_by = models.ForeignKey(USER, db_column="performed_by_id", verbose_name="Executado por",
                                     on_delete=models.PROTECT, related_name="+", null=True, blank=True)
    performed_at = models.DateTimeField("Executado em", db_column="performed_at", null=True, blank=True)
    notes = models.TextField("Observações", db_column="notes", blank=True, default="")

    class Meta:
        db_table = "laboratorio_baciloscopia"
        verbose_name = "Baciloscopia (BAAR)"
        verbose_name_plural = "Baciloscopias (BAAR)"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["tenant", "grade"])]

    @property
    def is_positive(self) -> bool:
        return self.grade != self.Grade.NEGATIVE

    def __str__(self) -> str:
        return f"BAAR {self.get_stain_display()}: {self.get_grade_display()}"


# =====================================================================
# BLOCOS: Gestão da Qualidade + Biossegurança (re-exportados para registo)
# =====================================================================
from .models_quality import (  # noqa: E402,F401
    AuditFinding,
    CompetencyAssessment,
    CorrectiveAction,
    CustomerComplaint,
    InternalAudit,
    LabRiskAssessment,
    ManagementReview,
    Nonconformity,
    QualityDocument,
    QualityIndicator,
    StaffTrainingRecord,
    TrainingReplication,
    TrainingAttachment,
)
from .models_biosafety import (  # noqa: E402,F401
    BiologicalHazard,
    TransmissionRoute,
    BiosafetyInspection,
    DecontaminationRecord,
    ExposureIncident,
    PPEDistribution,
    PPEItem,
    SpillResponseRecord,
    VaccinationRecord,
    WasteRecord,
)
