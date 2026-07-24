"""Semeia dados de demonstração para o módulo de Patologia.

Percorre o fluxo real do serviço — pedido → recepção → acessionamento →
macroscopia → processamento → inclusão → microtomia → lâminas → colorações →
citologia/IHC/molecular → diagnóstico → laudo → faturação/inventário/qualidade
/arquivo — de modo a que todos os 18 indicadores do painel tenham conteúdo
coerente entre si (50+ registos por indicador).
"""

import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.clinical.models.patient import Patient
from apps.human_resources.models.employee import Employee
from apps.pathology.models import (
    PathologyAccession,
    PathologyArchive,
    PathologyBillingEvent,
    PathologyCytologyCase,
    PathologyDiagnosisReview,
    PathologyEmbedding,
    PathologyGrossExamination,
    PathologyHistologySlide,
    PathologyImmunohistochemistry,
    PathologyInventoryUsage,
    PathologyMicrotomy,
    PathologyMolecularTest,
    PathologyPriority,
    PathologyProcessing,
    PathologyQualityControl,
    PathologyReport,
    PathologyRequest,
    PathologySampleReception,
    PathologyStaining,
)
from apps.tenants.models.tenant import Tenant

MARKER = "[SEED-PATHOLOGY]"

# Combinações pedido/amostra/sítio clinicamente plausíveis.
CASE_TYPES = [
    {
        "request_type": PathologyRequest.RequestType.BREAST_BIOPSY,
        "specimen_type": PathologySampleReception.SpecimenType.BIOPSY,
        "sites": ["Mama direita, QSE", "Mama esquerda, QSI", "Mama direita, retroareolar"],
        "diagnoses": ["Nódulo mamário a esclarecer", "Microcalcificações no rastreio"],
        "icd": "C50.9",
    },
    {
        "request_type": PathologyRequest.RequestType.GASTRIC_BIOPSY,
        "specimen_type": PathologySampleReception.SpecimenType.BIOPSY,
        "sites": ["Antro gástrico", "Corpo gástrico", "Incisura angularis"],
        "diagnoses": ["Epigastralgia persistente", "Úlcera gástrica em investigação"],
        "icd": "K29.7",
    },
    {
        "request_type": PathologyRequest.RequestType.SURGICAL_SPECIMEN,
        "specimen_type": PathologySampleReception.SpecimenType.SURGICAL_SPECIMEN,
        "sites": ["Cólon sigmoide", "Vesícula biliar", "Útero e anexos"],
        "diagnoses": ["Peça cirúrgica para estadiamento", "Colecistite crónica"],
        "icd": "C18.7",
    },
    {
        "request_type": PathologyRequest.RequestType.CERVICAL_CYTOLOGY,
        "specimen_type": PathologySampleReception.SpecimenType.CYTOLOGY,
        "sites": ["Colo do útero", "Endocérvix"],
        "diagnoses": ["Rastreio de cancro do colo do útero", "Controlo pós-tratamento"],
        "icd": "Z12.4",
    },
    {
        "request_type": PathologyRequest.RequestType.FNAC,
        "specimen_type": PathologySampleReception.SpecimenType.CYTOLOGY,
        "sites": ["Nódulo tiroideu", "Gânglio cervical", "Nódulo da parótida"],
        "diagnoses": ["Nódulo tiroideu de Bethesda a definir", "Adenopatia cervical"],
        "icd": "E04.1",
    },
]

SERVICES = ["Cirurgia Geral", "Ginecologia", "Gastrenterologia", "Endocrinologia", "Consulta Externa"]

GROSS_DESCRIPTIONS = [
    "Fragmento acastanhado, elástico, de superfície regular, seccionado em sua totalidade.",
    "Peça cirúrgica com margens tintadas; lesão esbranquiçada, mal delimitada, no centro.",
    "Múltiplos fragmentos irregulares, friáveis, incluídos integralmente em cassete única.",
    "Órgão de superfície lisa, parede espessada, sem lesões focais macroscópicas.",
]

MICROSCOPIC = [
    "Mucosa com infiltrado inflamatório crónico ligeiro, sem displasia.",
    "Proliferação epitelial atípica, com pleomorfismo nuclear moderado e mitoses frequentes.",
    "Tecido fibroadiposo sem alterações histológicas significativas.",
    "Epitélio escamoso maduro, com alterações reactivas inespecíficas.",
]

DIAGNOSES = [
    "Gastrite crónica ligeira, com actividade focal. Sem Helicobacter pylori identificado.",
    "Carcinoma ductal invasivo, grau histológico 2. Margens livres.",
    "Colecistite crónica litiásica. Ausência de malignidade.",
    "Adenoma tubular com displasia de baixo grau, excisado completamente.",
    "Tecido sem alterações histológicas relevantes.",
]

CONCLUSIONS = [
    "Achados benignos. Recomenda-se seguimento clínico habitual.",
    "Neoplasia maligna confirmada. Sugere-se discussão em reunião multidisciplinar.",
    "Lesão excisada na totalidade, com margens livres.",
    "Correlação clínico-patológica recomendada.",
]

STAINS = [
    (PathologyStaining.StainType.HE, "H&E", Decimal("150.00")),
    (PathologyStaining.StainType.PAS, "PAS", Decimal("320.00")),
    (PathologyStaining.StainType.ZIEHL_NEELSEN, "Ziehl-Neelsen", Decimal("340.00")),
    (PathologyStaining.StainType.GIEMSA, "Giemsa", Decimal("300.00")),
    (PathologyStaining.StainType.MASSON, "Tricrómio de Masson", Decimal("380.00")),
]

IHC_MARKERS = [
    ("ER", "SP1"), ("PR", "1E2"), ("HER2", "4B5"), ("Ki-67", "30-9"),
    ("CK7", "SP52"), ("CK20", "SP33"), ("p53", "DO-7"), ("CD20", "L26"),
]

MOLECULAR = [
    (PathologyMolecularTest.TestType.HPV, "HPV alto risco", "HPV 16/18/45"),
    (PathologyMolecularTest.TestType.EGFR, "EGFR éxons 18-21", "EGFR"),
    (PathologyMolecularTest.TestType.KRAS, "KRAS códons 12/13", "KRAS"),
    (PathologyMolecularTest.TestType.BRAF, "BRAF V600E", "BRAF"),
    (PathologyMolecularTest.TestType.PCR, "PCR para micobactérias", "MTB"),
]

LOCATIONS = ["Arquivo A - Prateleira 1", "Arquivo A - Prateleira 3", "Arquivo B - Prateleira 2", "Arquivo Central"]

QC_FINDINGS = [
    "Tempo de resposta acima do alvo definido para casos de rotina.",
    "Coloração com fundo excessivo; lote de reagente substituído.",
    "Amostra rejeitada por identificação incorrecta no recipiente.",
    "Concordância diagnóstica confirmada em segunda leitura.",
]


class Command(BaseCommand):
    help = "Cria dados de patologia realistas (50+ registos por indicador do painel)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--tenant",
            action="append",
            dest="tenants",
            help="Identificador do tenant. Pode ser repetido; por omissão usa 'local'.",
        )
        parser.add_argument(
            "--cases",
            type=int,
            default=70,
            help="Número de casos (pedido + amostra) a criar. Por omissão 70.",
        )
        parser.add_argument(
            "--seed",
            type=int,
            default=20260724,
            help="Semente aleatória, para tornar a geração reprodutível.",
        )
        parser.add_argument(
            "--keep-existing",
            action="store_true",
            help=(
                "Não apaga os dados de patologia já existentes no tenant. "
                "Por omissão o comando limpa-os primeiro, porque vários campos "
                "(nº de bloco, de lâmina, de laudo) são únicos por tenant e uma "
                "segunda execução colidiria com a anterior."
            ),
        )

    @transaction.atomic
    def handle(self, *args, **options):
        identifiers = options["tenants"] or ["local"]
        target = max(1, options["cases"])
        rng = random.Random(options["seed"])
        now = timezone.now()
        summary = []

        for identifier in identifiers:
            tenant = Tenant.objects.filter(identifier=identifier).first()
            if tenant is None:
                raise CommandError(f"Tenant não encontrado: {identifier}")

            patients = list(Patient.objects.filter(tenant=tenant).order_by("id")[:400])
            staff = list(Employee.objects.filter(tenant=tenant).order_by("id")[:40])
            if not patients:
                raise CommandError(f"O tenant {identifier} precisa de pelo menos 1 paciente.")
            if not staff:
                raise CommandError(f"O tenant {identifier} precisa de pelo menos 1 profissional.")

            if not options["keep_existing"]:
                self.purge_tenant(tenant)

            counts = self.seed_tenant(tenant, patients, staff, target, rng, now)
            summary.append(
                f"{identifier}: " + ", ".join(f"{label}={value}" for label, value in counts.items())
            )

        self.stdout.write(self.style.SUCCESS("Dados de patologia disponíveis. " + " | ".join(summary)))

    def purge_tenant(self, tenant):
        """Apaga apenas os registos criados por este comando, no tenant indicado.

        A limpeza é obrigatoriamente física (`hard_delete`): vários campos são
        únicos por tenant (nº de bloco, de lâmina, de laudo, nº de patologia) e
        as linhas apagadas de forma lógica continuam a ocupar esses valores,
        fazendo colidir a execução seguinte. Só são removidas as linhas com o
        marcador do seed, para preservar dados de demonstração pré-existentes.
        """
        models_in_order = [
            PathologyArchive,
            PathologyQualityControl,
            PathologyInventoryUsage,
            PathologyBillingEvent,
            PathologyDiagnosisReview,
            PathologyReport,
            PathologyMolecularTest,
            PathologyImmunohistochemistry,
            PathologyCytologyCase,
            PathologyStaining,
            PathologyHistologySlide,
            PathologyMicrotomy,
            PathologyEmbedding,
            PathologyProcessing,
            PathologyGrossExamination,
            PathologyAccession,
            PathologySampleReception,
            PathologyRequest,
        ]
        for model in models_in_order:
            manager = getattr(model, "all_objects", model.objects)
            queryset = manager.filter(tenant=tenant, notes__contains=MARKER)
            hard_delete = getattr(queryset, "hard_delete", None)
            if callable(hard_delete):
                hard_delete()
            else:
                # Sem `hard_delete` no queryset, remove ao nível do SQL para não
                # deixar as linhas a ocupar os valores únicos.
                model._base_manager.filter(pk__in=list(queryset.values_list("pk", flat=True))).delete()

    def seed_tenant(self, tenant, patients, staff, target, rng, now):
        counts = {key: 0 for key in (
            "pedidos", "recepções", "acessionamento", "macroscopia", "processamento",
            "inclusão", "microtomia", "lâminas", "colorações", "citologia", "IHC",
            "molecular", "diagnósticos", "laudos", "faturação", "inventário",
            "qualidade", "arquivo",
        )}
        product = self._first_product(tenant)

        for index in range(1, target + 1):
            case = rng.choice(CASE_TYPES)
            patient = rng.choice(patients)
            doctor = rng.choice(staff)
            pathologist = rng.choice(staff)
            technician = rng.choice(staff)

            requested_at = now - timedelta(days=rng.randint(1, 120), hours=rng.randint(0, 23))
            # Percentagem de casos que já percorreu cada etapa do fluxo.
            stage = rng.random()
            rejected = stage < 0.06
            reported = not rejected and stage > 0.28
            cytology_case = case["specimen_type"] == PathologySampleReception.SpecimenType.CYTOLOGY

            request = self._request(tenant, patient, doctor, case, requested_at, rejected, reported, rng)
            counts["pedidos"] += 1

            sample = self._sample(tenant, patient, request, technician, case, requested_at, rejected, reported, index, rng)
            counts["recepções"] += 1

            if rejected:
                # Amostra rejeitada não avança no fluxo; regista só a qualidade.
                self._quality(tenant, sample, None, None, None, pathologist, now, rng, rejected=True)
                counts["qualidade"] += 1
                continue

            accessioned_at = sample.received_at + timedelta(hours=rng.randint(1, 6))
            self._accession(tenant, sample, technician, accessioned_at, rng)
            counts["acessionamento"] += 1

            gross_at = accessioned_at + timedelta(hours=rng.randint(2, 24))
            gross = self._grossing(tenant, sample, pathologist, gross_at, case, rng)
            counts["macroscopia"] += 1

            processing_started = gross_at + timedelta(hours=rng.randint(1, 8))
            processing = self._processing(tenant, sample, technician, processing_started, gross, index, rng)
            counts["processamento"] += 1

            embedded_at = processing_started + timedelta(hours=rng.randint(10, 20))
            embedding = self._embedding(tenant, sample, processing, technician, embedded_at, index, rng)
            counts["inclusão"] += 1

            cut_at = embedded_at + timedelta(hours=rng.randint(1, 10))
            microtomy = self._microtomy(tenant, sample, embedding, technician, cut_at, rng)
            counts["microtomia"] += 1

            slides = self._slides(tenant, sample, processing, microtomy, technician, cut_at, index, reported, rng)
            counts["lâminas"] += len(slides)

            counts["colorações"] += len(
                self._stainings(tenant, sample, slides, microtomy, technician, cut_at, rng)
            )

            if cytology_case:
                self._cytology(tenant, sample, pathologist, sample.received_at, reported, rng)
                counts["citologia"] += 1

            if rng.random() < 0.45 and slides:
                counts["IHC"] += len(self._ihc(tenant, sample, slides, pathologist, cut_at, rng))

            if rng.random() < 0.62 and slides:
                self._molecular(tenant, sample, slides, doctor, technician, cut_at, rng)
                counts["molecular"] += 1

            report = None
            if reported:
                report = self._report(tenant, sample, pathologist, cut_at, index, rng)
                counts["laudos"] += 1

            self._diagnosis(tenant, sample, report, pathologist, staff, cut_at, reported, rng)
            counts["diagnósticos"] += 1

            counts["faturação"] += len(self._billing(tenant, sample, report, rng, now))

            if product is not None:
                counts["inventário"] += len(
                    self._inventory(tenant, sample, processing, technician, product, cut_at, rng)
                )

            self._quality(tenant, sample, slides[0] if slides else None, None, report, pathologist, now, rng)
            counts["qualidade"] += 1

            if reported:
                self._archive(tenant, sample, report, technician, cut_at, rng)
                counts["arquivo"] += 1

        return counts

    # ------------------------------------------------------------------ helpers

    def _first_product(self, tenant):
        product_model = PathologyInventoryUsage._meta.get_field("product").related_model
        return product_model.objects.filter(tenant=tenant).first()

    # ------------------------------------------------------------------ fluxo

    def _request(self, tenant, patient, doctor, case, requested_at, rejected, reported, rng):
        status = (
            PathologyRequest.Status.CANCELLED if rejected
            else PathologyRequest.Status.REPORTED if reported
            else rng.choice([PathologyRequest.Status.RECEIVED, PathologyRequest.Status.IN_PROGRESS])
        )
        return PathologyRequest.objects.create(
            tenant=tenant,
            patient=patient,
            requesting_doctor=doctor,
            service=rng.choice(SERVICES),
            request_type=case["request_type"],
            priority=rng.choices(
                [PathologyPriority.ROUTINE, PathologyPriority.URGENT, PathologyPriority.STAT],
                weights=[72, 22, 6],
            )[0],
            status=status,
            requested_at=requested_at,
            clinical_diagnosis=rng.choice(case["diagnoses"]),
            icd_code=case["icd"],
            anatomical_site=rng.choice(case["sites"]),
            notes=MARKER,
        )

    def _sample(self, tenant, patient, request, technician, case, requested_at, rejected, reported, index, rng):
        received_at = requested_at + timedelta(hours=rng.randint(1, 48))
        if rejected:
            status = PathologySampleReception.Status.REJECTED
        elif reported:
            status = rng.choice(
                [PathologySampleReception.Status.REPORTED, PathologySampleReception.Status.ARCHIVED]
            )
        else:
            status = rng.choice([
                PathologySampleReception.Status.ACCEPTED,
                PathologySampleReception.Status.IN_GROSSING,
                PathologySampleReception.Status.IN_PROCESSING,
                PathologySampleReception.Status.READY_FOR_REPORT,
            ])

        return PathologySampleReception.objects.create(
            tenant=tenant,
            patient=patient,
            request=request,
            received_by=technician,
            # O índice já é único no tenant; o ano sozinho não bastava porque as
            # datas de recepção atravessam a fronteira do ano.
            accession_number=f"PAT-{index:05d}",
            source=rng.choices(
                [
                    PathologySampleReception.Source.OUTPATIENT,
                    PathologySampleReception.Source.INPATIENT,
                    PathologySampleReception.Source.OPERATING_ROOM,
                    PathologySampleReception.Source.EXTERNAL,
                ],
                weights=[45, 22, 26, 7],
            )[0],
            specimen_type=case["specimen_type"],
            anatomical_site=request.anatomical_site,
            container_count=rng.randint(1, 4),
            fixation_type="Formol 10%",
            priority=request.priority,
            status=status,
            received_at=received_at,
            rejection_reason=(
                "Recipiente sem identificação do paciente." if rejected else ""
            ),
            clinical_history=request.clinical_diagnosis,
            notes=MARKER,
        )

    def _accession(self, tenant, sample, technician, accessioned_at, rng):
        return PathologyAccession.objects.create(
            tenant=tenant,
            sample=sample,
            accessioned_by=technician,
            accession_number=sample.accession_number,
            sub_sample_code=rng.choice(["A", "B", "C"]),
            barcode_type=rng.choice([
                PathologyAccession.BarcodeType.QR,
                PathologyAccession.BarcodeType.DATAMATRIX,
                PathologyAccession.BarcodeType.CODE128,
            ]),
            barcode_value=f"{sample.accession_number}-A",
            accessioned_at=accessioned_at,
            status=PathologyAccession.Status.ACTIVE,
            notes=MARKER,
        )

    def _grossing(self, tenant, sample, pathologist, performed_at, case, rng):
        surgical = case["specimen_type"] == PathologySampleReception.SpecimenType.SURGICAL_SPECIMEN
        return PathologyGrossExamination.objects.create(
            tenant=tenant,
            sample=sample,
            pathologist=pathologist,
            performed_at=performed_at,
            status=PathologyGrossExamination.Status.COMPLETED,
            specimen_weight_g=Decimal(str(rng.randint(120, 900))) if surgical else Decimal(str(rng.randint(1, 15))),
            dimensions=f"{rng.randint(1, 12)} x {rng.randint(1, 8)} x {rng.randint(1, 5)} cm",
            fragment_count=rng.randint(1, 6),
            cassette_count=rng.randint(1, 5),
            gross_description=rng.choice(GROSS_DESCRIPTIONS),
            notes=MARKER,
        )

    def _processing(self, tenant, sample, technician, started_at, gross, index, rng):
        completed_at = started_at + timedelta(hours=rng.randint(8, 16))
        return PathologyProcessing.objects.create(
            tenant=tenant,
            sample=sample,
            processor=technician,
            batch_number=f"LOTE-{started_at:%Y%m}-{index:04d}",
            protocol="Rotina overnight 12h",
            processor_machine=rng.choice(["Tissue-Tek VIP 6", "Leica ASP300S", "Excelsior AS"]),
            cassette_count=gross.cassette_count,
            started_at=started_at,
            completed_at=completed_at,
            status=PathologyProcessing.Status.COMPLETED,
            reagents=["Formol 10%", "Álcool 70/96/100%", "Xilol", "Parafina"],
            notes=MARKER,
        )

    def _embedding(self, tenant, sample, processing, technician, embedded_at, index, rng):
        return PathologyEmbedding.objects.create(
            tenant=tenant,
            sample=sample,
            processing=processing,
            embedded_by=technician,
            block_number=f"B{index:05d}",
            cassette_number=f"C{index:05d}",
            paraffin_type="Parafina histológica 56-58 °C",
            embedding_station=rng.choice(["Estação 1", "Estação 2", "Leica EG1150"]),
            embedded_at=embedded_at,
            status=PathologyEmbedding.Status.EMBEDDED,
            notes=MARKER,
        )

    def _microtomy(self, tenant, sample, embedding, technician, cut_at, rng):
        slide_count = rng.randint(1, 3)
        return PathologyMicrotomy.objects.create(
            tenant=tenant,
            sample=sample,
            embedding=embedding,
            cut_by=technician,
            section_thickness_microns=Decimal(rng.choice(["3.00", "4.00", "5.00"])),
            section_count=rng.randint(1, 6),
            slide_count=slide_count,
            cut_at=cut_at,
            status=PathologyMicrotomy.Status.CUT,
            notes=MARKER,
        )

    def _slides(self, tenant, sample, processing, microtomy, technician, prepared_at, index, reported, rng):
        created = []
        for number in range(1, microtomy.slide_count + 1):
            status = (
                rng.choice([
                    PathologyHistologySlide.Status.REVIEWED,
                    PathologyHistologySlide.Status.APPROVED,
                    PathologyHistologySlide.Status.ARCHIVED,
                ])
                if reported
                else rng.choice([
                    PathologyHistologySlide.Status.PREPARED,
                    PathologyHistologySlide.Status.STAINED,
                    PathologyHistologySlide.Status.REVIEW,
                ])
            )
            created.append(
                PathologyHistologySlide.objects.create(
                    tenant=tenant,
                    sample=sample,
                    processing=processing,
                    microtomy=microtomy,
                    prepared_by=technician,
                    slide_number=f"L{index:05d}-{number}",
                    block_number=microtomy.embedding.block_number,
                    stain="H&E",
                    prepared_at=prepared_at + timedelta(minutes=15 * number),
                    status=status,
                    current_location=rng.choice(LOCATIONS),
                    quality=rng.choice(["Boa", "Boa", "Aceitável", "Corte espesso"]),
                    notes=MARKER,
                )
            )
        return created

    def _stainings(self, tenant, sample, slides, microtomy, technician, performed_at, rng):
        created = []
        for slide in slides:
            stain_type, stain_name, price = STAINS[0] if rng.random() < 0.7 else rng.choice(STAINS)
            created.append(
                PathologyStaining.objects.create(
                    tenant=tenant,
                    sample=sample,
                    slide=slide,
                    microtomy=microtomy,
                    stained_by=technician,
                    stain_type=stain_type,
                    stain_name=stain_name,
                    protocol="Protocolo automático",
                    reagent_lot=f"RL-{rng.randint(1000, 9999)}",
                    performed_at=performed_at + timedelta(hours=1),
                    status=rng.choices(
                        [
                            PathologyStaining.Status.COMPLETED,
                            PathologyStaining.Status.REPEAT,
                            PathologyStaining.Status.FAILED,
                        ],
                        weights=[90, 7, 3],
                    )[0],
                    billable=True,
                    unit_price=price,
                    notes=MARKER,
                )
            )
        return created

    def _cytology(self, tenant, sample, cytologist, received_at, reported, rng):
        return PathologyCytologyCase.objects.create(
            tenant=tenant,
            sample=sample,
            cytologist=cytologist,
            specimen_source=sample.anatomical_site,
            preparation_method=rng.choice(["Meio líquido (ThinPrep)", "Esfregaço convencional", "Citospin"]),
            adequacy=rng.choices(
                [
                    PathologyCytologyCase.Adequacy.ADEQUATE,
                    PathologyCytologyCase.Adequacy.LIMITED,
                    PathologyCytologyCase.Adequacy.UNSATISFACTORY,
                ],
                weights=[82, 13, 5],
            )[0],
            status=(
                PathologyCytologyCase.Status.REPORTED if reported
                else rng.choice([PathologyCytologyCase.Status.SCREENING, PathologyCytologyCase.Status.REVIEW])
            ),
            screened_at=received_at + timedelta(days=rng.randint(1, 5)),
            microscopic_description=rng.choice(MICROSCOPIC),
            interpretation=rng.choice([
                "Negativo para lesão intraepitelial ou malignidade.",
                "ASC-US - células escamosas atípicas de significado indeterminado.",
                "Material com celularidade limitada; sugere-se repetição.",
            ]),
            notes=MARKER,
        )

    def _ihc(self, tenant, sample, slides, pathologist, performed_at, rng):
        created = []
        for marker, clone in rng.sample(IHC_MARKERS, rng.randint(2, 4)):
            result = rng.choices(
                [
                    PathologyImmunohistochemistry.Result.POSITIVE,
                    PathologyImmunohistochemistry.Result.NEGATIVE,
                    PathologyImmunohistochemistry.Result.EQUIVOCAL,
                ],
                weights=[52, 40, 8],
            )[0]
            positive = result == PathologyImmunohistochemistry.Result.POSITIVE
            created.append(
                PathologyImmunohistochemistry.objects.create(
                    tenant=tenant,
                    sample=sample,
                    slide=rng.choice(slides),
                    interpreted_by=pathologist,
                    marker=marker,
                    clone=clone,
                    antibody_lot=f"AB-{rng.randint(10000, 99999)}",
                    result=result,
                    intensity=rng.choice(["1+", "2+", "3+"]) if positive else "",
                    percentage_positive=Decimal(str(rng.randint(10, 95))) if positive else Decimal("0.00"),
                    control_status=PathologyImmunohistochemistry.ControlStatus.VALID,
                    performed_at=performed_at + timedelta(days=1),
                    billable=True,
                    unit_price=Decimal("850.00"),
                    notes=MARKER,
                )
            )
        return created

    def _molecular(self, tenant, sample, slides, requested_by, performed_by, performed_at, rng):
        test_type, target, gene = rng.choice(MOLECULAR)
        status = rng.choices(
            [
                PathologyMolecularTest.Status.COMPLETED,
                PathologyMolecularTest.Status.RUNNING,
                PathologyMolecularTest.Status.REQUESTED,
                PathologyMolecularTest.Status.FAILED,
            ],
            weights=[68, 15, 12, 5],
        )[0]
        done = status == PathologyMolecularTest.Status.COMPLETED
        return PathologyMolecularTest.objects.create(
            tenant=tenant,
            sample=sample,
            slide=rng.choice(slides),
            requested_by=requested_by,
            performed_by=performed_by,
            test_type=test_type,
            target=target,
            gene_panel=gene,
            specimen_quality=rng.choice(["Adequada", "Adequada", "Limitada"]),
            reagent_lot=f"MOL-{rng.randint(1000, 9999)}",
            status=status,
            result=("Não detectada mutação." if rng.random() < 0.6 else "Mutação detectada.") if done else "",
            interpretation=(
                "Sem alterações com relevância terapêutica actual." if done else ""
            ),
            performed_at=performed_at + timedelta(days=rng.randint(2, 10)) if done else None,
            billable=True,
            unit_price=Decimal("2400.00"),
            notes=MARKER,
        )

    def _report(self, tenant, sample, pathologist, base_at, index, rng):
        signed_at = base_at + timedelta(days=rng.randint(1, 8))
        status = rng.choices(
            [PathologyReport.Status.FINAL, PathologyReport.Status.AMENDED, PathologyReport.Status.PRELIMINARY],
            weights=[80, 8, 12],
        )[0]
        final = status in {PathologyReport.Status.FINAL, PathologyReport.Status.AMENDED}
        return PathologyReport.objects.create(
            tenant=tenant,
            sample=sample,
            pathologist=pathologist,
            report_number=f"LAU-{index:05d}",
            status=status,
            diagnosis=rng.choice(DIAGNOSES),
            gross_summary=rng.choice(GROSS_DESCRIPTIONS),
            microscopic_description=rng.choice(MICROSCOPIC),
            immunohistochemistry_summary="Painel imunohistoquímico compatível com o diagnóstico." if rng.random() < 0.4 else "",
            conclusion=rng.choice(CONCLUSIONS),
            icd_code=sample.request.icd_code if sample.request_id else "",
            signed_at=signed_at if final else None,
            delivered_at=signed_at + timedelta(days=1) if final else None,
            notes=MARKER,
        )

    def _diagnosis(self, tenant, sample, report, pathologist, staff, base_at, reported, rng):
        review_type = rng.choices(
            [
                PathologyDiagnosisReview.ReviewType.PRIMARY,
                PathologyDiagnosisReview.ReviewType.SECOND_OPINION,
                PathologyDiagnosisReview.ReviewType.DIGITAL,
                PathologyDiagnosisReview.ReviewType.AI_ASSISTED,
            ],
            weights=[64, 18, 12, 6],
        )[0]
        status = (
            PathologyDiagnosisReview.Status.FINAL if reported
            else rng.choice([PathologyDiagnosisReview.Status.DRAFT, PathologyDiagnosisReview.Status.REVIEW])
        )
        reviewed_at = base_at + timedelta(days=rng.randint(1, 6))
        return PathologyDiagnosisReview.objects.create(
            tenant=tenant,
            sample=sample,
            report=report,
            pathologist=pathologist,
            reviewer=rng.choice(staff) if review_type == PathologyDiagnosisReview.ReviewType.SECOND_OPINION else None,
            review_type=review_type,
            status=status,
            digital_viewer_url=(
                f"https://digitalpath.local/slides/{sample.accession_number}"
                if review_type == PathologyDiagnosisReview.ReviewType.DIGITAL else ""
            ),
            diagnosis=rng.choice(DIAGNOSES),
            staging=rng.choice(["pT1N0", "pT2N1", "pT3N0", ""]),
            margins=rng.choice(["Livres", "Livres", "Comprometidas", ""]),
            histologic_grade=rng.choice(["G1", "G2", "G3", ""]),
            comments="Revisão concluída sem discordância." if reported else "",
            reviewed_at=reviewed_at if reported else None,
            signed_at=reviewed_at if reported else None,
            notes=MARKER,
        )

    def _billing(self, tenant, sample, report, rng, now):
        events = [
            (PathologyBillingEvent.EventType.RECEPTION, "Recepção e acessionamento", Decimal("250.00")),
            (PathologyBillingEvent.EventType.HE_STAIN, "Coloração H&E", Decimal("150.00")),
        ]
        if rng.random() < 0.4:
            events.append((PathologyBillingEvent.EventType.IHC, "Painel de imunohistoquímica", Decimal("850.00")))
        if sample.priority != PathologyPriority.ROUTINE:
            events.append((PathologyBillingEvent.EventType.URGENCY, "Taxa de urgência", Decimal("400.00")))

        created = []
        for event_type, description, price in events:
            quantity = Decimal(str(rng.randint(1, 3)))
            line_total = (price * quantity).quantize(Decimal("0.01"))
            vat = Decimal("16.00")
            created.append(
                PathologyBillingEvent.objects.create(
                    tenant=tenant,
                    sample=sample,
                    report=report,
                    event_type=event_type,
                    description=description,
                    quantity=quantity,
                    unit_price=price,
                    vat_percentage=vat,
                    line_total=line_total,
                    total_with_vat=(line_total * (1 + vat / 100)).quantize(Decimal("0.01")),
                    status=(
                        PathologyBillingEvent.BillingStatus.BILLED if report is not None
                        else rng.choice([
                            PathologyBillingEvent.BillingStatus.DRAFT,
                            PathologyBillingEvent.BillingStatus.READY,
                        ])
                    ),
                    billable=True,
                    billed_at=now if report is not None else None,
                    notes=MARKER,
                )
            )
        return created

    def _inventory(self, tenant, sample, processing, technician, product, consumed_at, rng):
        created = []
        for label, unit, cost in [
            ("Formol tamponado 10%", "L", Decimal("120.00")),
            ("Parafina histológica", "kg", Decimal("380.00")),
        ]:
            quantity = Decimal(str(round(rng.uniform(0.2, 2.5), 2)))
            created.append(
                PathologyInventoryUsage.objects.create(
                    tenant=tenant,
                    sample=sample,
                    processing=processing,
                    product=product,
                    consumed_by=technician,
                    quantity=quantity,
                    unit=unit,
                    unit_cost=cost,
                    line_total=(quantity * cost).quantize(Decimal("0.01")),
                    lot_number=f"LT-{rng.randint(1000, 9999)}",
                    consumed_at=consumed_at,
                    notes=f"{MARKER} {label}",
                )
            )
        return created

    def _quality(self, tenant, sample, slide, staining, report, reviewer, now, rng, rejected=False):
        if rejected:
            control_type = PathologyQualityControl.ControlType.REJECTION_RATE
            status = PathologyQualityControl.Status.FAIL
        else:
            control_type = rng.choices(
                [
                    PathologyQualityControl.ControlType.TURNAROUND_TIME,
                    PathologyQualityControl.ControlType.DIAGNOSTIC_CONCORDANCE,
                    PathologyQualityControl.ControlType.REWORK,
                    PathologyQualityControl.ControlType.STAIN_FAILURE,
                ],
                weights=[50, 26, 14, 10],
            )[0]
            status = rng.choices(
                [
                    PathologyQualityControl.Status.PASS,
                    PathologyQualityControl.Status.WARNING,
                    PathologyQualityControl.Status.FAIL,
                    PathologyQualityControl.Status.OPEN,
                ],
                weights=[62, 20, 8, 10],
            )[0]

        turnaround = Decimal(str(rng.randint(24, 240)))
        return PathologyQualityControl.objects.create(
            tenant=tenant,
            sample=sample,
            slide=slide,
            staining=staining,
            report=report,
            reviewed_by=reviewer,
            control_type=control_type,
            status=status,
            turnaround_hours=turnaround,
            metric_value=turnaround,
            metric_unit="horas",
            finding=rng.choice(QC_FINDINGS),
            corrective_action=(
                "Reprocessamento e revisão do protocolo."
                if status in {PathologyQualityControl.Status.FAIL, PathologyQualityControl.Status.WARNING}
                else ""
            ),
            reviewed_at=now if status != PathologyQualityControl.Status.OPEN else None,
            due_at=now + timedelta(days=7) if status == PathologyQualityControl.Status.OPEN else None,
            notes=MARKER,
        )

    def _archive(self, tenant, sample, report, responsible, base_at, rng):
        archived_at = base_at + timedelta(days=rng.randint(5, 20))
        return PathologyArchive.objects.create(
            tenant=tenant,
            sample=sample,
            report=report,
            responsible=responsible,
            archive_type=rng.choices(
                [
                    PathologyArchive.ArchiveType.BLOCK,
                    PathologyArchive.ArchiveType.SLIDE,
                    PathologyArchive.ArchiveType.DIGITAL,
                ],
                weights=[52, 40, 8],
            )[0],
            status=rng.choices(
                [
                    PathologyArchive.Status.ARCHIVED,
                    PathologyArchive.Status.BORROWED,
                    PathologyArchive.Status.LOST,
                ],
                weights=[90, 8, 2],
            )[0],
            location=rng.choice(LOCATIONS),
            box_number=f"CX-{rng.randint(1, 60):03d}",
            shelf=f"P{rng.randint(1, 8)}",
            archived_at=archived_at,
            retention_until=(archived_at + timedelta(days=365 * 10)).date(),
            notes=MARKER,
        )
