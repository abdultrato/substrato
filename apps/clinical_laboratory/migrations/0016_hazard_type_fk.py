# Manually crafted: criar HazardType, migrar dados do CharField antigo, substituir por FK.

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def migrate_hazard_types(apps, schema_editor):
    BiologicalHazard = apps.get_model("laboratorio", "BiologicalHazard")
    HazardType = apps.get_model("laboratorio", "HazardType")

    seen: dict[tuple, object] = {}
    for hazard in BiologicalHazard.objects.exclude(hazard_type_text__isnull=True).exclude(hazard_type_text=""):
        key = (hazard.tenant_id, hazard.hazard_type_text)
        if key not in seen:
            ht, _ = HazardType.objects.get_or_create(
                tenant_id=hazard.tenant_id,
                name=hazard.hazard_type_text,
                defaults={"active": True},
            )
            seen[key] = ht
        hazard.hazard_type_fk = seen[key]
        hazard.save(update_fields=["hazard_type_fk"])


def reverse_hazard_types(apps, schema_editor):
    BiologicalHazard = apps.get_model("laboratorio", "BiologicalHazard")
    for hazard in BiologicalHazard.objects.select_related("hazard_type_fk").filter(hazard_type_fk__isnull=False):
        hazard.hazard_type_text = hazard.hazard_type_fk.name
        hazard.save(update_fields=["hazard_type_text"])


class Migration(migrations.Migration):

    dependencies = [
        ('inquilinos', '0004_tenantconfiguration_fiscal_address_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('laboratorio', '0015_hazard_m2m_ppe_routes_containment'),
    ]

    operations = [
        # 1. Create HazardType catalog table
        migrations.CreateModel(
            name='HazardType',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, db_column='created_at', db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True, db_column='updated_at')),
                ('custom_id', models.CharField(blank=True, db_column='custom_id', db_index=True, editable=False, max_length=40, null=True, unique=True)),
                ('deleted', models.BooleanField(db_column='deleted', db_index=True, default=False)),
                ('deleted_at', models.DateTimeField(blank=True, db_column='deleted_at', null=True)),
                ('version', models.PositiveIntegerField(db_column='version', default=1)),
                ('name', models.CharField(db_column='name', max_length=80, verbose_name='Nome')),
                ('description', models.TextField(blank=True, db_column='description', default='', verbose_name='Descrição')),
                ('active', models.BooleanField(db_column='active', db_index=True, default=True, verbose_name='Ativo')),
                ('created_by', models.ForeignKey(blank=True, db_column='created_by_id', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='%(class)s_criado', to=settings.AUTH_USER_MODEL)),
                ('deleted_by', models.ForeignKey(blank=True, db_column='deleted_by_id', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='%(class)s_deleted', to=settings.AUTH_USER_MODEL)),
                ('tenant', models.ForeignKey(db_column='tenant_id', on_delete=django.db.models.deletion.PROTECT, related_name='%(class)ss', to='inquilinos.tenant')),
                ('updated_by', models.ForeignKey(blank=True, db_column='updated_by_id', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='%(class)s_atualizado', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Tipo de perigo',
                'verbose_name_plural': 'Tipos de perigo',
                'db_table': 'laboratorio_bio_tipo_perigo',
                'ordering': ['name'],
            },
        ),
        # 2. Rename old CharField to a temp name so we can add the new FK column
        migrations.RenameField(
            model_name='biologicalhazard',
            old_name='hazard_type',
            new_name='hazard_type_text',
        ),
        # 3. Add the new FK column (nullable)
        migrations.AddField(
            model_name='biologicalhazard',
            name='hazard_type_fk',
            field=models.ForeignKey(
                blank=True, null=True,
                db_column='hazard_type_id',
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='hazards',
                to='laboratorio.hazardtype',
                verbose_name='Tipo de perigo',
            ),
        ),
        # 4. Migrate data: text values → HazardType rows → FK
        migrations.RunPython(migrate_hazard_types, reverse_hazard_types),
        # 5. Remove old text column
        migrations.RemoveField(model_name='biologicalhazard', name='hazard_type_text'),
        # 6. Rename FK column to the canonical name
        migrations.RenameField(
            model_name='biologicalhazard',
            old_name='hazard_type_fk',
            new_name='hazard_type',
        ),
    ]
