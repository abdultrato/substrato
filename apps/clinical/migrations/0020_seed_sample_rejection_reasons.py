from django.db import migrations


CHOICES = [
    ("VOLUME_INSUFICIENTE", "Volume insuficiente"),
    ("HEMOLISE", "Amostra hemolisada"),
    ("COAGULADA", "Amostra coagulada"),
    ("TUBO_ERRADO", "Tubo/frasco incorreto"),
    ("SEM_IDENTIFICACAO", "Identificação ausente ou incorreta"),
    ("CONTAMINADA", "Amostra contaminada/derramada"),
    ("TRANSPORTE_TARDIO", "Tempo de transporte excedido"),
    ("CONSERVACAO_INADEQUADA", "Conservação/temperatura inadequada"),
    ("OUTRO", "Outro motivo"),
]


def seed_reasons(apps, schema_editor):
    SampleRejectionReason = apps.get_model("clinical", "SampleRejectionReason")
    Tenant = apps.get_model("inquilinos", "Tenant")

    for tenant in Tenant.objects.all():
        for code, name in CHOICES:
            SampleRejectionReason.objects.get_or_create(
                tenant=tenant,
                code=code,
                defaults={"name": name},
            )


def unseed_reasons(apps, schema_editor):
    SampleRejectionReason = apps.get_model("clinical", "SampleRejectionReason")
    SampleRejectionReason.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("clinical", "0019_labrequestitem_rejection_note_and_more"),
        ("inquilinos", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_reasons, unseed_reasons),
    ]
