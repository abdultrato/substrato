"""
Configura o analisador hematologico EDAN H30 no sistema Substrato.

Cria:
  - IntegrationEquipment (protocolo ASTM, TCP/IP)
  - LabExamField completos para o exame Hemograma
  - IntegrationAnalyteMapping: codigo EDAN -> campo do hemograma
"""

from __future__ import annotations

from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.clinical.models import LabExam, LabExamField
from apps.equipment_integrations.models import IntegrationAnalyteMapping, IntegrationEquipment
from apps.tenants.models import Tenant
from core.constants.laboratory.result_type import ResultType
from core.constants.laboratory.units import DefaultUnit

DEFAULT_TCP_PORT = 2575

# ---------------------------------------------------------------------------
# Campos completos do hemograma (EDAN H30)
# codigo_edan, nome_pt, unidade, ref_min, ref_max, crit_min, crit_max
# ---------------------------------------------------------------------------
HEMOGRAM_FIELDS = [
    ("WBC",    "Leucocitos",              DefaultUnit.X10_3_UL,   Decimal("4.00"),  Decimal("11.00"),  Decimal("2.00"),  Decimal("30.00")),
    ("RBC",    "Eritrocitos",             DefaultUnit.X10_6_UL,   Decimal("3.50"),  Decimal("5.50"),   Decimal("2.00"),  Decimal("8.00")),
    ("HGB",    "Hemoglobina",             DefaultUnit.G_DL,       Decimal("12.00"), Decimal("17.50"),  Decimal("7.00"),  Decimal("20.00")),
    ("HCT",    "Hematocrito",             DefaultUnit.PERCENT,    Decimal("36.00"), Decimal("52.00"),  Decimal("20.00"), Decimal("65.00")),
    ("MCV",    "VCM",                     DefaultUnit.FL,         Decimal("80.00"), Decimal("100.00"), Decimal("60.00"), Decimal("120.00")),
    ("MCH",    "HCM",                     DefaultUnit.PG,        Decimal("27.00"), Decimal("33.00"),  Decimal("15.00"), Decimal("45.00")),
    ("MCHC",   "CHCM",                    DefaultUnit.G_DL,       Decimal("31.00"), Decimal("36.00"),  Decimal("20.00"), Decimal("40.00")),
    ("PLT",    "Plaquetas",               DefaultUnit.X10_3_UL,   Decimal("150.00"),Decimal("450.00"), Decimal("50.00"), Decimal("1000.00")),
    ("LYM%",   "Linfocitos %",            DefaultUnit.PERCENT,    Decimal("20.00"), Decimal("40.00"),  None,             None),
    ("MXD%",   "Monoucitos %",            DefaultUnit.PERCENT,    Decimal("2.00"),  Decimal("10.00"),  None,             None),
    ("NEU%",   "Neutrofilos %",           DefaultUnit.PERCENT,    Decimal("50.00"), Decimal("70.00"),  None,             None),
    ("LYM#",   "Linfocitos (abs)",        DefaultUnit.X10_3_UL,   Decimal("1.00"),  Decimal("4.80"),   Decimal("0.50"),  Decimal("15.00")),
    ("MXD#",   "Monoucitos (abs)",        DefaultUnit.X10_3_UL,   Decimal("0.10"),  Decimal("1.00"),   None,             None),
    ("NEU#",   "Neutrofilos (abs)",       DefaultUnit.X10_3_UL,   Decimal("1.80"),  Decimal("7.50"),   Decimal("0.50"),  Decimal("25.00")),
    ("RDW-CV", "RDW-CV",                  DefaultUnit.PERCENT,    Decimal("11.00"), Decimal("16.00"),  None,             None),
    ("RDW-SD", "RDW-SD",                  DefaultUnit.FL,         Decimal("35.00"), Decimal("56.00"),  None,             None),
    ("PDW",    "PDW",                     DefaultUnit.FL,         Decimal("9.00"),  Decimal("17.00"),  None,             None),
    ("MPV",    "VPM",                     DefaultUnit.FL,         Decimal("7.00"),  Decimal("11.00"),  None,             None),
    ("P-LCR",  "P-LCR",                   DefaultUnit.PERCENT,    Decimal("13.00"), Decimal("43.00"),  None,             None),
]

# Codigos alternativos que o EDAN H30 pode enviar conforme versao de firmware
EXTRA_ALIASES = {
    "HB":     "HGB",
    "HT":     "HCT",
    "LYMPH%": "LYM%",
    "MONO%":  "MXD%",
    "GRAN%":  "NEU%",
    "LYMPH#": "LYM#",
    "MONO#":  "MXD#",
    "GRAN#":  "NEU#",
}


class Command(BaseCommand):
    help = (
        "Configura o analisador EDAN H30 (hemograma) no sistema:\n"
        "  - Regista o equipamento com protocolo ASTM/TCP\n"
        "  - Cria os campos do hemograma em falta\n"
        "  - Cria os mapeamentos de analitos (codigo EDAN -> campo)\n"
        "  - Mostra como iniciar o listener e enviar ordens"
    )

    def add_arguments(self, parser):
        parser.add_argument("--tenant", type=int, default=None, help="ID do tenant (padrao: primeiro).")
        parser.add_argument("--pc-ip", default="192.168.1.2", help="IP do PC na rede do EDAN (padrao: 192.168.1.2).")
        parser.add_argument("--tcp-port", type=int, default=DEFAULT_TCP_PORT, help=f"Porta TCP (padrao: {DEFAULT_TCP_PORT}).")
        parser.add_argument("--serial-number", default="", help="Numero de serie do aparelho.")
        parser.add_argument(
            "--exam",
            default="",
            help="custom_id do exame Hemograma ja existente (ex: EXA-MZ-001). "
                 "Se omitido, procura pelo nome.",
        )
        parser.add_argument(
            "--custom-id",
            default="EQP-EDAN-H30",
            help="custom_id do equipamento no sistema (padrao: EQP-EDAN-H30).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Mostra o que seria criado sem gravar no banco.",
        )

    def handle(self, *args, **options):
        tenant_id = options.get("tenant")
        tenant = (
            Tenant.objects.filter(pk=tenant_id).first()
            if tenant_id
            else Tenant.objects.order_by("pk").first()
        )
        if not tenant:
            raise CommandError("Nenhum tenant encontrado.")

        dry_run = options["dry_run"]
        custom_id = options["custom_id"]

        # --- 1. Localizar o exame Hemograma -----------------------------------
        exam = self._resolve_exam(tenant, options["exam"])
        if exam is None:
            raise CommandError(
                "Exame de hemograma nao encontrado.\n"
                "Crie o exame primeiro ou indique --exam <custom_id>."
            )
        self.stdout.write(f"Exame    : {exam.name} [{exam.custom_id}]")

        with transaction.atomic():
            if dry_run:
                transaction.set_rollback(True)

            # --- 2. Equipamento ---------------------------------------------------
            equipment = self._ensure_equipment(tenant, custom_id, options)

            # --- 3. Campos do hemograma + mapeamentos ----------------------------
            created_fields, created_maps, skipped_maps = self._ensure_fields_and_mappings(
                tenant, exam, equipment
            )

        # --- Resumo -----------------------------------------------------------
        self.stdout.write("")
        self.stdout.write("=" * 62)
        self.stdout.write("  EDAN H30 — Analisador Hematologico")
        self.stdout.write("=" * 62)
        self.stdout.write(f"  Equipamento : {equipment.name} [{equipment.custom_id}]")
        self.stdout.write(f"  Protocolo   : ASTM (LIS1-A2) via TCP/IP")
        self.stdout.write(f"  IP do PC    : {options['pc_ip']}:{options['tcp_port']}")
        self.stdout.write(f"  Campos criados     : {len(created_fields)}")
        self.stdout.write(f"  Mapeamentos criados: {len(created_maps)}")
        self.stdout.write(f"  Ja existentes      : {len(skipped_maps)}")
        if dry_run:
            self.stdout.write(self.style.WARNING("  (DRY-RUN: nada gravado)"))
        self.stdout.write("=" * 62)

        self._print_instructions(custom_id, options)

    # ---------------------------------------------------------------------- #

    def _resolve_exam(self, tenant, exam_custom_id: str):
        qs = LabExam.objects.filter(tenant=tenant, deleted=False)
        if exam_custom_id:
            return qs.filter(custom_id=exam_custom_id).first()
        # Procura por nome (hemograma / blood count)
        return (
            qs.filter(name__icontains="hemograma").first()
            or qs.filter(name__icontains="hemogram").first()
            or qs.filter(name__icontains="blood count").first()
            or qs.filter(name__icontains="cbc").first()
        )

    def _ensure_equipment(self, tenant, custom_id: str, options: dict) -> IntegrationEquipment:
        config = {
            "tcp_host": "0.0.0.0",
            "tcp_port": options["tcp_port"],
            "pc_ip": options["pc_ip"],
            "timeout_seconds": 30,
        }
        equipment = IntegrationEquipment.all_objects.filter(custom_id=custom_id).first()
        if equipment:
            equipment.config = config
            equipment.active = True
            if options["serial_number"]:
                equipment.serial_number = options["serial_number"]
            equipment.save(update_fields=["config", "active", "serial_number", "updated_at"])
            self.stdout.write(self.style.WARNING(f"Equipamento {custom_id} actualizado."))
        else:
            equipment = IntegrationEquipment(
                tenant=tenant,
                custom_id=custom_id,
                name="EDAN H30",
                manufacturer="EDAN",
                model="H30",
                serial_number=options.get("serial_number") or "",
                modality=IntegrationEquipment.Modalidade.HEMOGRAMA,
                protocol=IntegrationEquipment.Protocolo.ASTM_TCP,
                connection_mode=IntegrationEquipment.ConnectionMode.TCP_SERVER,
                tcp_framing=IntegrationEquipment.TcpFraming.RAW,
                encoding="utf-8",
                auto_consume_results=True,
                active=True,
                config=config,
            )
            equipment.save()
            self.stdout.write(self.style.SUCCESS(f"Equipamento {custom_id} criado."))
        return equipment

    def _ensure_fields_and_mappings(
        self,
        tenant,
        exam: LabExam,
        equipment: IntegrationEquipment,
    ) -> tuple[list, list, list]:
        created_fields: list[str] = []
        created_maps: list[str] = []
        skipped_maps: list[str] = []

        existing_fields = {
            f.name.lower().strip(): f
            for f in LabExamField.objects.filter(exam=exam, deleted=False)
        }
        max_pos = max((f.position for f in existing_fields.values()), default=0)

        for position_offset, (code, name_pt, unit, ref_min, ref_max, crit_min, crit_max) in enumerate(
            HEMOGRAM_FIELDS, start=1
        ):
            # Garante que o campo existe no exame
            field = existing_fields.get(name_pt.lower().strip())
            if field is None:
                max_pos += 1
                field_custom_id = f"{exam.custom_id}-H{position_offset:02d}"
                field = LabExamField(
                    tenant=tenant,
                    custom_id=field_custom_id,
                    exam=exam,
                    name=name_pt,
                    type=ResultType.NUMERICO,
                    unit=unit,
                    reference_min=ref_min,
                    reference_max=ref_max,
                    critical_min=crit_min,
                    critical_max=crit_max,
                    position=max_pos,
                )
                field.save()
                created_fields.append(name_pt)
                self.stdout.write(f"  + Campo criado : {name_pt} [{unit}]")

            # Mapeamento codigo EDAN -> campo
            mapping = IntegrationAnalyteMapping.objects.filter(
                equipment=equipment,
                code=code,
                deleted=False,
            ).first()
            if mapping is None:
                IntegrationAnalyteMapping.objects.create(
                    tenant=tenant,
                    equipment=equipment,
                    code=code,
                    exam_field=field,
                    active=True,
                )
                created_maps.append(code)
            else:
                skipped_maps.append(code)

        # Aliases de firmware (mapeam para o mesmo campo do codigo principal)
        for alias_code, canonical_code in EXTRA_ALIASES.items():
            canonical_name = next(
                (name for c, name, *_ in HEMOGRAM_FIELDS if c == canonical_code), None
            )
            if not canonical_name:
                continue
            field = LabExamField.objects.filter(
                exam=exam,
                name__iexact=canonical_name,
                deleted=False,
            ).first()
            if field is None:
                continue
            exists = IntegrationAnalyteMapping.objects.filter(
                equipment=equipment,
                code=alias_code,
                deleted=False,
            ).exists()
            if not exists:
                IntegrationAnalyteMapping.objects.create(
                    tenant=tenant,
                    equipment=equipment,
                    code=alias_code,
                    exam_field=field,
                    active=True,
                )
                created_maps.append(alias_code)
            else:
                skipped_maps.append(alias_code)

        return created_fields, created_maps, skipped_maps

    def _print_instructions(self, custom_id: str, options: dict) -> None:
        pc_ip = options["pc_ip"]
        tcp_port = options["tcp_port"]

        self.stdout.write("")
        self.stdout.write("PASSO 1 — IP do PC (executar PowerShell como Administrador):")
        self.stdout.write("")
        self.stdout.write(
            f'  netsh interface ip set address "Ethernet 2" '
            f"static {pc_ip} 255.255.255.0 192.168.1.1"
        )
        self.stdout.write("")
        self.stdout.write("PASSO 2 — Configurar o EDAN H30 (menu do aparelho):")
        self.stdout.write("")
        self.stdout.write("  Menu: Setup > Communication / LIS Setup")
        self.stdout.write(f"    LIS Protocol : ASTM   (nao SOAP, nao HL7)")
        self.stdout.write(f"    LIS IP       : {pc_ip}")
        self.stdout.write(f"    LIS Port     : {tcp_port}")
        self.stdout.write(f"    Auto Send    : ON")
        self.stdout.write(f"    Sample ID    : numero de acesso da requisicao")
        self.stdout.write("")
        self.stdout.write("PASSO 3 — Iniciar o listener TCP:")
        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"  python manage.py run_equipment_tcp_listener "
                f"--equipment {custom_id} --port {tcp_port}"
            )
        )
        self.stdout.write("")
        self.stdout.write("PASSO 4 — Por cada requisicao de hemograma, criar a ordem:")
        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"  python manage.py create_hemogram_order "
                f"--request <REQ-ID> --equipment {custom_id}"
            )
        )
        self.stdout.write("")
        self.stdout.write(
            "  O comando mostra o numero de acesso a introduzir no aparelho."
        )
        self.stdout.write("")
        self.stdout.write(
            "FLUXO COMPLETO:\n"
            "  1. Cria requisicao no sistema (hemograma)\n"
            "  2. Corre create_hemogram_order -> obtem o numero de acesso\n"
            "  3. Introduz esse numero no EDAN H30 (Sample ID)\n"
            "  4. Coloca a amostra de sangue no aparelho\n"
            "  5. O EDAN analisa e envia os resultados automaticamente via ASTM\n"
            "  6. O listener recebe e preenche o ResultItem no sistema"
        )
