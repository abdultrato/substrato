"""Backfill: cria registos de rejeição (pendentes) para as amostras que já
estavam rejeitadas antes de existir o modelo SampleRejectionRecord.

As rejeições resolvidas anteriores não podem ser reconstruídas — os motivos do
item eram limpos na recolheita/receção, logo não há histórico persistido. A
partir daqui o ciclo (rejeitar -> reconferir -> receber) fica registado.
"""

from django.db import migrations


def backfill_pending(apps, schema_editor):
    LabRequestItem = apps.get_model("clinical", "LabRequestItem")
    SampleRejectionRecord = apps.get_model("clinical", "SampleRejectionRecord")

    rejected = LabRequestItem.objects.filter(deleted=False, sample_status="rejeitada")
    for item in rejected.iterator():
        if SampleRejectionRecord.objects.filter(request_item_id=item.pk).exists():
            continue
        reason_names = [r.name for r in item.rejection_reasons.all() if getattr(r, "name", "")]
        reasons_text = (", ".join(reason_names) or (item.rejection_note or ""))[:500]
        record = SampleRejectionRecord.objects.create(
            tenant_id=item.tenant_id,
            request_id=item.request_id,
            request_item_id=item.pk,
            reasons_text=reasons_text,
            note=item.rejection_note or "",
            status="pendente",
        )
        # Aproxima a data de rejeição da última alteração do item (o created_at
        # é auto_now_add e ficaria com a data da migração).
        if getattr(item, "updated_at", None):
            SampleRejectionRecord.objects.filter(pk=record.pk).update(created_at=item.updated_at)


def noop(apps, schema_editor):
    # Não removemos os registos no reverse: passam a ser a fonte de verdade.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("clinical", "0027_samplerejectionrecord"),
    ]

    operations = [
        migrations.RunPython(backfill_pending, noop),
    ]
