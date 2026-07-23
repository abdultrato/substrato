"""Semeia jornadas clinicamente coerentes para o painel de telemedicina."""

from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.clinical.models.patient import Patient
from apps.human_resources.models.employee import Employee
from apps.telemedicine.models import (
    ChronicMonitoringProgram,
    RemoteClinicalAlert,
    RemoteMonitoringDevice,
    RemoteVitalReading,
    StoreAndForwardCase,
    TelemedicineWaitingRoomEntry,
)
from apps.tenants.models.tenant import Tenant


MARKER = "[SEED-TELEMEDICINE]"


class Command(BaseCommand):
    help = "Cria dados de telemedicina realistas usando pacientes e clínicos já cadastrados."

    def add_arguments(self, parser):
        parser.add_argument(
            "--tenant",
            action="append",
            dest="tenants",
            help="Identificador do tenant. Pode ser repetido; por omissão usa local e default.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        identifiers = options["tenants"] or ["local", "default"]
        now = timezone.now()
        summary = []

        for identifier in identifiers:
            tenant = Tenant.objects.filter(identifier=identifier).first()
            if tenant is None:
                raise CommandError(f"Tenant não encontrado: {identifier}")

            patients = list(Patient.objects.filter(tenant=tenant).order_by("id")[:6])
            clinicians = list(Employee.objects.filter(tenant=tenant).order_by("id")[:2])
            if len(patients) < 6 or not clinicians:
                raise CommandError(f"O tenant {identifier} precisa de pelo menos 6 pacientes e 1 profissional.")

            clinician = clinicians[0]
            reviewer = clinicians[-1]
            records = self.seed_tenant(tenant, patients, clinician, reviewer, now)
            summary.append(f"{identifier}: " + ", ".join(f"{label}={count}" for label, count in records.items()))

        self.stdout.write(self.style.SUCCESS("Dados de telemedicina disponíveis. " + " | ".join(summary)))

    def upsert(self, model, tenant, key, **defaults):
        obj, _ = model.objects.update_or_create(
            tenant=tenant,
            notes=f"{MARKER} {key}",
            defaults={**defaults, "notes": f"{MARKER} {key}"},
        )
        return obj

    def seed_tenant(self, tenant, patients, clinician, reviewer, now):
        waiting_data = [
            ("waiting-checkin", patients[0], "CHECKED_IN", "PRIORITY", 1, "Renovação de receita para hipertensão"),
            ("waiting-triage", patients[1], "TRIAGE", "ROUTINE", 2, "Revisão de glicemia capilar"),
            ("waiting-ready", patients[2], "READY", "URGENT", 3, "Dispneia ligeira com tosse há 3 dias"),
            ("waiting-call", patients[3], "IN_CALL", "ROUTINE", 4, "Seguimento de insuficiência cardíaca"),
        ]
        for key, patient, status, priority, position, complaint in waiting_data:
            defaults = {
                "patient": patient,
                "clinician": clinician if status == "IN_CALL" else None,
                "status": status,
                "priority": priority,
                "queue_position": position,
                "check_in_at": now - timedelta(minutes=position * 9),
                "chief_complaint": complaint,
                "preliminary_symptoms": "Avaliação remota com confirmação de identidade e contacto de retorno.",
                "device_check_passed": status in {"READY", "IN_CALL"},
                "consent_confirmed": status in {"READY", "IN_CALL"},
                "triage_started_at": now - timedelta(minutes=26) if status in {"TRIAGE", "READY", "IN_CALL"} else None,
                "triage_completed_at": now - timedelta(minutes=12) if status in {"READY", "IN_CALL"} else None,
                "call_started_at": now - timedelta(minutes=5) if status == "IN_CALL" else None,
                "video_room_url": "https://telemedicina.local/sala/seguimento" if status == "IN_CALL" else "",
            }
            self.upsert(TelemedicineWaitingRoomEntry, tenant, key, **defaults)

        devices = []
        for key, patient, device_type, manufacturer, model in [
            ("device-bp", patients[0], "BLOOD_PRESSURE", "Omron", "M2 Basic"),
            ("device-glucose", patients[1], "GLUCOMETER", "Accu-Chek", "Guide"),
            ("device-oximeter", patients[2], "PULSE_OXIMETER", "ChoiceMMed", "MD300C"),
            ("device-scale", patients[3], "SCALE", "Withings", "Body Smart"),
            ("device-wearable", patients[4], "WEARABLE", "Garmin", "Vivosmart"),
        ]:
            device = self.upsert(
                RemoteMonitoringDevice,
                tenant,
                key,
                patient=patient,
                device_type=device_type,
                status="ACTIVE",
                manufacturer=manufacturer,
                model_name=model,
                serial_number=f"TM-{tenant.identifier.upper()}-{key.upper()}",
                external_device_id=f"integration-{tenant.identifier}-{key}",
                paired_at=now - timedelta(days=30),
                last_sync_at=now - timedelta(minutes=8),
                battery_percent=Decimal("82.00"),
            )
            devices.append(device)

        vital_data = [
            ("vital-bp-normal", patients[0], devices[0], {"systolic_bp": 128, "diastolic_bp": 78, "heart_rate_bpm": 72}),
            ("vital-bp-high", patients[0], devices[0], {"systolic_bp": 186, "diastolic_bp": 122, "heart_rate_bpm": 88}),
            ("vital-glucose", patients[1], devices[1], {"glucose_mg_dl": Decimal("214.00")}),
            ("vital-spo2", patients[2], devices[2], {"spo2_percent": Decimal("88.00"), "heart_rate_bpm": 104}),
            ("vital-weight", patients[3], devices[3], {"weight_kg": Decimal("78.40")}),
            ("vital-wearable", patients[4], devices[4], {"heart_rate_bpm": 76, "respiratory_rate": 17}),
        ]
        readings = {}
        for key, patient, device, values in vital_data:
            readings[key] = self.upsert(
                RemoteVitalReading,
                tenant,
                key,
                patient=patient,
                device=device,
                measured_at=now - timedelta(minutes=len(readings) * 7),
                received_at=now - timedelta(minutes=len(readings) * 7 - 1),
                source="INTEGRATION",
                raw_payload={"source": "telemedicine-demo", "validated": True},
                **values,
            )

        programs = []
        for key, patient, condition, targets in [
            ("program-hypertension", patients[0], "HYPERTENSION", {"target_systolic_max": 135, "target_diastolic_max": 85}),
            ("program-diabetes", patients[1], "DIABETES", {"target_glucose_min": Decimal("70.00"), "target_glucose_max": Decimal("180.00")}),
            ("program-copd", patients[2], "COPD", {"target_spo2_min": Decimal("92.00")}),
            ("program-heart", patients[3], "HEART_FAILURE", {"target_systolic_max": 130, "target_diastolic_max": 80}),
        ]:
            programs.append(
                self.upsert(
                    ChronicMonitoringProgram,
                    tenant,
                    key,
                    patient=patient,
                    care_manager=clinician,
                    condition=condition,
                    status="ACTIVE",
                    start_date=now.date() - timedelta(days=30),
                    review_frequency_days=14,
                    next_review_date=now.date() + timedelta(days=7),
                    care_plan="Monitorização domiciliária, revisão clínica programada e reforço da adesão terapêutica.",
                    escalation_protocol="Contactar o paciente; se persistirem valores de risco, encaminhar para avaliação presencial.",
                    **targets,
                )
            )

        case_data = [
            ("case-dermatology", patients[4], "DERMATOLOGY", "SUBMITTED", "Lesão cutânea de evolução recente", "Avaliar necessidade de observação presencial.", "", ""),
            ("case-radiology", patients[5], "RADIOLOGY", "IN_REVIEW", "Revisão de exame de imagem", "Correlacionar achado radiológico com quadro clínico.", "Em revisão pelo especialista.", ""),
            ("case-wound", patients[2], "WOUND_CARE", "NEEDS_INFO", "Seguimento de ferida crónica", "Orientar cuidados locais e solicitar imagem de controlo.", "Solicitada fotografia adicional com escala.", ""),
            ("case-ophthalmology", patients[1], "OPHTHALMOLOGY", "COMPLETED", "Rastreio de retinopatia diabética", "Definir prioridade de avaliação oftalmológica.", "Imagem com alterações a confirmar em consulta.", "Encaminhar para oftalmologia em até 30 dias."),
        ]
        for key, patient, area, status, title, question, findings, recommendation in case_data:
            self.upsert(
                StoreAndForwardCase,
                tenant,
                key,
                patient=patient,
                requested_by=clinician,
                reviewer=reviewer if status in {"IN_REVIEW", "NEEDS_INFO", "COMPLETED"} else None,
                specialty_area=area,
                status=status,
                submitted_at=now - timedelta(hours=3),
                reviewed_at=now - timedelta(hours=1) if status == "COMPLETED" else None,
                title=title,
                clinical_question=question,
                clinical_summary="Dados clínicos revistos no seguimento remoto.",
                media_manifest=[{"type": "clinical-image", "status": "available"}],
                findings=findings,
                recommendation=recommendation,
            )

        alert_data = [
            ("alert-pressure", patients[0], programs[0], readings["vital-bp-high"], devices[0], "VITAL_THRESHOLD", "CRITICAL", "OPEN", "Pressão arterial crítica identificada na medição domiciliária.", "Contactar imediatamente e orientar avaliação urgente."),
            ("alert-spo2", patients[2], programs[2], readings["vital-spo2"], devices[2], "VITAL_THRESHOLD", "HIGH", "ACKNOWLEDGED", "Saturação periférica abaixo da meta do programa.", "Repetir medição e avaliar sinais de alarme."),
            ("alert-missed", patients[1], programs[1], None, devices[1], "MISSED_READING", "MEDIUM", "RESOLVED", "Leitura de glicemia não recebida no período previsto.", "Confirmar técnica de medição e adesão."),
            ("alert-offline", patients[4], None, None, devices[4], "DEVICE_OFFLINE", "LOW", "OPEN", "Dispositivo sem sincronização recente.", "Verificar ligação e nível de bateria."),
        ]
        for key, patient, program, reading, device, alert_type, severity, status, message, action in alert_data:
            self.upsert(
                RemoteClinicalAlert,
                tenant,
                key,
                patient=patient,
                program=program,
                reading=reading,
                device=device,
                alert_type=alert_type,
                severity=severity,
                status=status,
                triggered_at=now - timedelta(minutes=20),
                acknowledged_at=now - timedelta(minutes=12) if status in {"ACKNOWLEDGED", "RESOLVED"} else None,
                acknowledged_by=clinician if status in {"ACKNOWLEDGED", "RESOLVED"} else None,
                resolved_at=now - timedelta(minutes=2) if status == "RESOLVED" else None,
                resolved_by=clinician if status == "RESOLVED" else None,
                message=message,
                recommended_action=action,
                action_taken="Paciente contactado e plano de seguimento confirmado." if status == "RESOLVED" else "",
            )

        return {
            "sala": TelemedicineWaitingRoomEntry.objects.filter(tenant=tenant, notes__startswith=MARKER).count(),
            "dispositivos": RemoteMonitoringDevice.objects.filter(tenant=tenant, notes__startswith=MARKER).count(),
            "leituras": RemoteVitalReading.objects.filter(tenant=tenant, notes__startswith=MARKER).count(),
            "casos": StoreAndForwardCase.objects.filter(tenant=tenant, notes__startswith=MARKER).count(),
            "programas": ChronicMonitoringProgram.objects.filter(tenant=tenant, notes__startswith=MARKER).count(),
            "alertas": RemoteClinicalAlert.objects.filter(tenant=tenant, notes__startswith=MARKER).count(),
        }
