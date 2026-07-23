"""Semeia dados de demonstração para o módulo de Radiologia.

Gera pelo menos 60 registos por indicador do painel (equipamentos, protocolos,
estudos, séries, ficheiros, laudos e eventos PACS), usando pacientes e
profissionais já cadastrados no tenant.
"""

import random
from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.clinical.models.patient import Patient
from apps.human_resources.models.employee import Employee
from apps.radiology.models import (
    ImagingBodyRegion,
    ImagingEquipment,
    ImagingFile,
    ImagingModality,
    ImagingProtocol,
    ImagingReport,
    ImagingSeries,
    ImagingStudy,
    PacsIntegrationEvent,
)
from apps.tenants.models.tenant import Tenant

MARKER = "[SEED-RADIOLOGY]"

# Combinações modalidade/região clinicamente plausíveis.
MODALITY_REGIONS = {
    ImagingModality.XRAY: [
        ImagingBodyRegion.CHEST,
        ImagingBodyRegion.SPINE,
        ImagingBodyRegion.UPPER_LIMB,
        ImagingBodyRegion.LOWER_LIMB,
        ImagingBodyRegion.PELVIS,
    ],
    ImagingModality.ULTRASOUND: [
        ImagingBodyRegion.ABDOMEN,
        ImagingBodyRegion.PELVIS,
        ImagingBodyRegion.NECK,
        ImagingBodyRegion.VASCULAR,
    ],
    ImagingModality.CT: [
        ImagingBodyRegion.HEAD,
        ImagingBodyRegion.CHEST,
        ImagingBodyRegion.ABDOMEN,
        ImagingBodyRegion.SPINE,
    ],
    ImagingModality.MRI: [
        ImagingBodyRegion.HEAD,
        ImagingBodyRegion.SPINE,
        ImagingBodyRegion.LOWER_LIMB,
        ImagingBodyRegion.PELVIS,
    ],
    ImagingModality.MAMMOGRAPHY: [ImagingBodyRegion.BREAST],
    ImagingModality.FLUOROSCOPY: [ImagingBodyRegion.ABDOMEN, ImagingBodyRegion.CHEST],
    ImagingModality.DENSITOMETRY: [ImagingBodyRegion.SPINE, ImagingBodyRegion.PELVIS],
}

MODALITY_LABEL = {
    ImagingModality.XRAY: "Raio-X",
    ImagingModality.ULTRASOUND: "Ultrassom",
    ImagingModality.CT: "TC",
    ImagingModality.MRI: "RM",
    ImagingModality.MAMMOGRAPHY: "Mamografia",
    ImagingModality.FLUOROSCOPY: "Fluoroscopia",
    ImagingModality.DENSITOMETRY: "Densitometria",
}

REGION_LABEL = {
    ImagingBodyRegion.HEAD: "Crânio",
    ImagingBodyRegion.NECK: "Pescoço",
    ImagingBodyRegion.CHEST: "Tórax",
    ImagingBodyRegion.ABDOMEN: "Abdómen",
    ImagingBodyRegion.PELVIS: "Pelve",
    ImagingBodyRegion.SPINE: "Coluna",
    ImagingBodyRegion.UPPER_LIMB: "Membro superior",
    ImagingBodyRegion.LOWER_LIMB: "Membro inferior",
    ImagingBodyRegion.BREAST: "Mama",
    ImagingBodyRegion.VASCULAR: "Vascular",
}

MANUFACTURERS = [
    ("Siemens Healthineers", "Ysio Max"),
    ("GE Healthcare", "Revolution ACT"),
    ("Philips", "Ingenia Ambition"),
    ("Canon Medical", "Aquilion Lightning"),
    ("Fujifilm", "FDR Smart X"),
    ("Mindray", "Resona I9"),
    ("Hologic", "Selenia Dimensions"),
]

LOCATIONS = [
    "Bloco A - Piso 0",
    "Bloco A - Piso 1",
    "Bloco B - Urgência",
    "Bloco B - Piso 2",
    "Bloco C - Ambulatório",
    "Unidade Móvel",
]

INDICATIONS = [
    "Dor torácica em investigação",
    "Traumatismo após queda",
    "Tosse persistente há três semanas",
    "Dor abdominal no quadrante inferior direito",
    "Cefaleia intensa de início súbito",
    "Lombalgia com irradiação para o membro inferior",
    "Controlo pós-operatório",
    "Rastreio oncológico de rotina",
    "Suspeita de fratura por stress",
    "Avaliação de nódulo palpável",
    "Dispneia em agravamento",
    "Seguimento de doença crónica",
]

FINDINGS = [
    "Estruturas ósseas com morfologia e densidade preservadas.",
    "Parênquima pulmonar sem consolidações ou derrame pleural.",
    "Fígado de dimensões normais, contornos regulares e ecoestrutura homogénea.",
    "Discreta redução do espaço discal, sem sinais de compressão radicular.",
    "Pequena imagem nodular, de limites definidos, a caracterizar.",
    "Ausência de lesões expansivas ou de efeito de massa.",
]

IMPRESSIONS = [
    "Exame sem alterações relevantes.",
    "Achados compatíveis com processo inflamatório em resolução.",
    "Alterações degenerativas ligeiras, adequadas à idade.",
    "Recomenda-se correlação clínica e laboratorial.",
    "Nódulo a controlar em exame de seguimento.",
    "Sem evidência de lesão aguda.",
]

RECOMMENDATIONS = [
    "Correlação com a clínica do doente.",
    "Repetir o exame em seis meses.",
    "Complementar com estudo contrastado, se indicado.",
    "Sem necessidade de novo estudo imagiológico.",
    "Encaminhar para consulta de especialidade.",
]

TECHNIQUES = [
    "Aquisição em incidências padrão, sem contraste.",
    "Cortes axiais volumétricos com reconstruções multiplanares.",
    "Sequências ponderadas em T1, T2 e STIR.",
    "Estudo em modo B com Doppler colorido.",
    "Aquisição digital em duas incidências, com compressão adequada.",
]


class Command(BaseCommand):
    help = "Cria dados de radiologia realistas (60+ registos por indicador do painel)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--tenant",
            action="append",
            dest="tenants",
            help="Identificador do tenant. Pode ser repetido; por omissão usa 'local'.",
        )
        parser.add_argument(
            "--studies",
            type=int,
            default=130,
            help="Número de estudos a criar (por omissão 130, o suficiente para 60+ laudos).",
        )
        parser.add_argument(
            "--seed",
            type=int,
            default=20260723,
            help="Semente aleatória, para tornar a geração reprodutível.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        identifiers = options["tenants"] or ["local"]
        study_target = max(60, options["studies"])
        rng = random.Random(options["seed"])
        now = timezone.now()
        summary = []

        for identifier in identifiers:
            tenant = Tenant.objects.filter(identifier=identifier).first()
            if tenant is None:
                raise CommandError(f"Tenant não encontrado: {identifier}")

            patients = list(Patient.objects.filter(tenant=tenant).order_by("id")[:400])
            clinicians = list(Employee.objects.filter(tenant=tenant).order_by("id")[:40])
            if not patients:
                raise CommandError(f"O tenant {identifier} precisa de pelo menos 1 paciente.")
            if not clinicians:
                raise CommandError(f"O tenant {identifier} precisa de pelo menos 1 profissional.")

            counts = self.seed_tenant(tenant, patients, clinicians, study_target, rng, now)
            summary.append(
                f"{identifier}: " + ", ".join(f"{label}={value}" for label, value in counts.items())
            )

        self.stdout.write(self.style.SUCCESS("Dados de radiologia disponíveis. " + " | ".join(summary)))

    def seed_tenant(self, tenant, patients, clinicians, study_target, rng, now):
        equipment = self.seed_equipment(tenant, rng, now)
        protocols = self.seed_protocols(tenant, rng)
        studies = self.seed_studies(tenant, patients, clinicians, equipment, protocols, study_target, rng, now)
        series = self.seed_series(tenant, studies, rng)
        files = self.seed_files(tenant, series, rng)
        reports = self.seed_reports(tenant, studies, clinicians, rng, now)
        events = self.seed_pacs_events(tenant, studies, equipment, rng, now)

        return {
            "equipamentos": len(equipment),
            "protocolos": len(protocols),
            "estudos": len(studies),
            "séries": len(series),
            "ficheiros": len(files),
            "laudos": len(reports),
            "eventos PACS": len(events),
        }

    # ------------------------------------------------------------------ equipamentos

    def seed_equipment(self, tenant, rng, now):
        modalities = list(MODALITY_REGIONS)
        created = []

        for index in range(1, 66):
            modality = modalities[index % len(modalities)]
            manufacturer, model = MANUFACTURERS[index % len(MANUFACTURERS)]
            code = f"EQ-{MODALITY_LABEL[modality][:3].upper()}-{index:03d}"
            last_qc = (now - timedelta(days=rng.randint(20, 300))).date()

            equipment, _ = ImagingEquipment.all_objects.update_or_create(
                tenant=tenant,
                code=code,
                defaults={
                    "name": f"{MODALITY_LABEL[modality]} {index:02d} - {model}",
                    "modality": modality,
                    "status": rng.choices(
                        [
                            ImagingEquipment.Status.ACTIVE,
                            ImagingEquipment.Status.MAINTENANCE,
                            ImagingEquipment.Status.INACTIVE,
                        ],
                        weights=[80, 14, 6],
                    )[0],
                    "manufacturer": manufacturer,
                    "model": model,
                    "serial_number": f"SN{index:05d}{modality[:2]}",
                    "ae_title": f"AE_{MODALITY_LABEL[modality][:3].upper()}{index:03d}",
                    "station_name": f"STATION-{index:03d}",
                    "location": LOCATIONS[index % len(LOCATIONS)],
                    "pacs_endpoint": f"dicom://pacs.local:11112/AE_{index:03d}",
                    "last_quality_control": last_qc,
                    "next_quality_control": last_qc + timedelta(days=180),
                    "notes": MARKER,
                    "deleted": False,
                },
            )
            created.append(equipment)

        return created

    # ------------------------------------------------------------------ protocolos

    def seed_protocols(self, tenant, rng):
        pairs = [
            (modality, region)
            for modality, regions in MODALITY_REGIONS.items()
            for region in regions
        ]
        created = []

        for index in range(1, 66):
            modality, region = pairs[index % len(pairs)]
            contrast = modality in {ImagingModality.CT, ImagingModality.MRI} and index % 3 == 0
            code = f"PR-{index:03d}"

            protocol, _ = ImagingProtocol.all_objects.update_or_create(
                tenant=tenant,
                code=code,
                defaults={
                    "name": f"{MODALITY_LABEL[modality]} de {REGION_LABEL[region]}"
                    + (" com contraste" if contrast else ""),
                    "modality": modality,
                    "body_region": region,
                    "contrast_required": contrast,
                    "typical_duration_minutes": rng.choice([10, 15, 20, 25, 30, 45]),
                    "preparation": (
                        "Jejum de 4 horas e acesso venoso periférico."
                        if contrast
                        else "Sem preparação específica. Remover objetos metálicos."
                    ),
                    "acquisition_instructions": rng.choice(TECHNIQUES),
                    "default_report_template": "Técnica:\n\nAchados:\n\nImpressão:\n",
                    "notes": MARKER,
                    "deleted": False,
                },
            )
            created.append(protocol)

        return created

    # ------------------------------------------------------------------ estudos

    def seed_studies(self, tenant, patients, clinicians, equipment, protocols, target, rng, now):
        by_modality = {}
        for item in equipment:
            if item.status == ImagingEquipment.Status.ACTIVE:
                by_modality.setdefault(item.modality, []).append(item)

        protocols_by_modality = {}
        for item in protocols:
            protocols_by_modality.setdefault(item.modality, []).append(item)

        statuses = [
            (ImagingStudy.Status.REQUESTED, 10),
            (ImagingStudy.Status.SCHEDULED, 12),
            (ImagingStudy.Status.IN_PROGRESS, 8),
            (ImagingStudy.Status.ACQUIRED, 12),
            (ImagingStudy.Status.REPORTING, 10),
            (ImagingStudy.Status.REPORTED, 16),
            (ImagingStudy.Status.VALIDATED, 14),
            (ImagingStudy.Status.DELIVERED, 14),
            (ImagingStudy.Status.CANCELLED, 4),
        ]
        status_values = [item[0] for item in statuses]
        status_weights = [item[1] for item in statuses]

        created = []
        for index in range(1, target + 1):
            protocol = rng.choice(protocols)
            modality = protocol.modality
            candidates = by_modality.get(modality) or []
            station = rng.choice(candidates) if candidates else None
            status = rng.choices(status_values, weights=status_weights)[0]

            requested_at = now - timedelta(days=rng.randint(0, 90), hours=rng.randint(0, 23))
            scheduled_at = started_at = acquired_at = completed_at = None
            if status != ImagingStudy.Status.REQUESTED:
                scheduled_at = requested_at + timedelta(hours=rng.randint(2, 72))
            if status in {
                ImagingStudy.Status.IN_PROGRESS,
                ImagingStudy.Status.ACQUIRED,
                ImagingStudy.Status.REPORTING,
                ImagingStudy.Status.REPORTED,
                ImagingStudy.Status.VALIDATED,
                ImagingStudy.Status.DELIVERED,
            }:
                started_at = scheduled_at + timedelta(minutes=rng.randint(0, 90))
            if status in {
                ImagingStudy.Status.ACQUIRED,
                ImagingStudy.Status.REPORTING,
                ImagingStudy.Status.REPORTED,
                ImagingStudy.Status.VALIDATED,
                ImagingStudy.Status.DELIVERED,
            }:
                acquired_at = started_at + timedelta(minutes=protocol.typical_duration_minutes or 15)
            if status in {
                ImagingStudy.Status.REPORTED,
                ImagingStudy.Status.VALIDATED,
                ImagingStudy.Status.DELIVERED,
            }:
                completed_at = acquired_at + timedelta(hours=rng.randint(1, 48))

            accession = f"ACC{index:06d}"
            study, _ = ImagingStudy.all_objects.update_or_create(
                tenant=tenant,
                accession_number=accession,
                defaults={
                    "patient": rng.choice(patients),
                    "requesting_doctor": rng.choice(clinicians),
                    "radiologist": rng.choice(clinicians),
                    "protocol": protocol,
                    "equipment": station,
                    "study_instance_uid": f"1.2.826.0.1.3680043.10.{tenant.id}.{index:06d}",
                    "modality": modality,
                    "body_region": protocol.body_region,
                    "status": status,
                    "priority": rng.choices(
                        [
                            ImagingStudy.Priority.ROUTINE,
                            ImagingStudy.Priority.URGENT,
                            ImagingStudy.Priority.STAT,
                        ],
                        weights=[70, 22, 8],
                    )[0],
                    "clinical_indication": rng.choice(INDICATIONS),
                    "requested_at": requested_at,
                    "scheduled_at": scheduled_at,
                    "started_at": started_at,
                    "acquired_at": acquired_at,
                    "completed_at": completed_at,
                    "contrast_used": protocol.contrast_required and acquired_at is not None,
                    "contrast_details": (
                        "Iodado não iónico, 80 mL EV" if protocol.contrast_required else ""
                    ),
                    "storage_uri": f"pacs://studies/{accession}",
                    "notes": MARKER,
                    "deleted": False,
                },
            )
            created.append(study)

        return created

    # ------------------------------------------------------------------ séries

    def seed_series(self, tenant, studies, rng):
        created = []
        for study in studies:
            if study.status in {ImagingStudy.Status.REQUESTED, ImagingStudy.Status.SCHEDULED, ImagingStudy.Status.CANCELLED}:
                continue

            for number in range(1, rng.randint(1, 3) + 1):
                series, _ = ImagingSeries.all_objects.update_or_create(
                    study=study,
                    series_number=number,
                    defaults={
                        "tenant": tenant,
                        "series_instance_uid": f"{study.study_instance_uid}.{number}",
                        "modality": study.modality,
                        "body_region": study.body_region,
                        "description": f"Série {number} - {REGION_LABEL.get(study.body_region, 'Estudo')}",
                        "image_count": rng.randint(12, 240),
                        "storage_uri": f"pacs://series/{study.accession_number}/{number}",
                        "acquisition_started_at": study.started_at,
                        "acquisition_completed_at": study.acquired_at,
                        "notes": MARKER,
                        "deleted": False,
                    },
                )
                created.append(series)

        return created

    # ------------------------------------------------------------------ ficheiros

    def seed_files(self, tenant, series_list, rng):
        created = []
        for series in series_list:
            for image_number in range(1, rng.randint(1, 3) + 1):
                sop = f"{series.series_instance_uid}.{image_number}"
                imaging_file, _ = ImagingFile.all_objects.update_or_create(
                    tenant=tenant,
                    sop_instance_uid=sop,
                    defaults={
                        "study": series.study,
                        "series": series,
                        "file_type": rng.choices(
                            [
                                ImagingFile.FileType.DICOM,
                                ImagingFile.FileType.IMAGE,
                                ImagingFile.FileType.REPORT_PDF,
                            ],
                            weights=[75, 18, 7],
                        )[0],
                        "pacs_object_uri": f"pacs://objects/{sop}",
                        "content_type": "application/dicom",
                        "file_size": rng.randint(180_000, 24_000_000),
                        "image_number": image_number,
                        "checksum": f"{rng.getrandbits(128):032x}",
                        "notes": MARKER,
                        "deleted": False,
                    },
                )
                created.append(imaging_file)

        return created

    # ------------------------------------------------------------------ laudos

    def seed_reports(self, tenant, studies, clinicians, rng, now):
        reportable = [
            study
            for study in studies
            if study.status
            in {
                ImagingStudy.Status.REPORTING,
                ImagingStudy.Status.REPORTED,
                ImagingStudy.Status.VALIDATED,
                ImagingStudy.Status.DELIVERED,
            }
        ]

        created = []
        for study in reportable:
            status = (
                ImagingReport.Status.PRELIMINARY
                if study.status == ImagingStudy.Status.REPORTING
                else rng.choices(
                    [ImagingReport.Status.FINAL, ImagingReport.Status.AMENDED],
                    weights=[88, 12],
                )[0]
            )
            critical = rng.random() < 0.12
            reported_at = study.completed_at or study.acquired_at or now

            report, _ = ImagingReport.all_objects.update_or_create(
                study=study,
                version_number=1,
                defaults={
                    "tenant": tenant,
                    "radiologist": study.radiologist or rng.choice(clinicians),
                    "status": status,
                    "reported_at": reported_at,
                    "template_used": "Modelo padrão",
                    "technique": rng.choice(TECHNIQUES),
                    "findings": rng.choice(FINDINGS),
                    "impression": rng.choice(IMPRESSIONS),
                    "recommendations": rng.choice(RECOMMENDATIONS),
                    "critical_result": critical,
                    "critical_notified_at": reported_at + timedelta(minutes=25) if critical else None,
                    "notes": MARKER,
                    "deleted": False,
                },
            )
            created.append(report)

        return created

    # ------------------------------------------------------------------ eventos PACS

    def seed_pacs_events(self, tenant, studies, equipment, rng, now):
        created = []
        for study in studies:
            flow = [PacsIntegrationEvent.EventType.WORKLIST_CREATE]
            if study.status not in {ImagingStudy.Status.REQUESTED, ImagingStudy.Status.CANCELLED}:
                flow.append(PacsIntegrationEvent.EventType.STUDY_SYNC)
            if study.acquired_at:
                flow.append(PacsIntegrationEvent.EventType.STORE)
            if study.completed_at:
                flow.append(PacsIntegrationEvent.EventType.REPORT_SEND)

            for order, event_type in enumerate(flow, start=1):
                failed = rng.random() < 0.08
                status = (
                    PacsIntegrationEvent.Status.FAILED
                    if failed
                    else rng.choices(
                        [
                            PacsIntegrationEvent.Status.ACKNOWLEDGED,
                            PacsIntegrationEvent.Status.SENT,
                            PacsIntegrationEvent.Status.PENDING,
                        ],
                        weights=[70, 22, 8],
                    )[0]
                )
                message_id = f"MSG-{study.accession_number}-{order}"

                event, _ = PacsIntegrationEvent.all_objects.update_or_create(
                    tenant=tenant,
                    message_control_id=message_id,
                    defaults={
                        "study": study,
                        "equipment": study.equipment or (rng.choice(equipment) if equipment else None),
                        "event_type": (
                            PacsIntegrationEvent.EventType.ERROR if failed else event_type
                        ),
                        "direction": (
                            PacsIntegrationEvent.Direction.INBOUND
                            if event_type == PacsIntegrationEvent.EventType.STORE
                            else PacsIntegrationEvent.Direction.OUTBOUND
                        ),
                        "status": status,
                        "external_system": "PACS-Orthanc",
                        "event_at": (study.requested_at or now) + timedelta(minutes=15 * order),
                        "payload": {
                            "accession": study.accession_number,
                            "modality": study.modality,
                            "operation": event_type,
                        },
                        "response": {} if failed else {"code": "0", "message": "OK"},
                        "error_message": (
                            "Timeout na associação DICOM com o AE remoto." if failed else ""
                        ),
                        "retry_count": rng.randint(1, 3) if failed else 0,
                        "deleted": False,
                    },
                )
                created.append(event)

        return created
