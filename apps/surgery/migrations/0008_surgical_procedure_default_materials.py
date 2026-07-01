# Recria o passo em falta na cadeia de migrações do módulo de cirurgia.
#
# Adiciona `SurgicalProcedure.default_materials` como um ManyToManyField simples
# para `farmacia.Product`, usando explicitamente a tabela intermédia
# `cirurgia_procedimento_materiais` (colunas `surgicalprocedure_id` e
# `product_id`). A migração 0009 assume que esta tabela já existe para depois
# acrescentar a coluna `quantity` e converter o M2M num through model (apenas em
# estado). Sem este 0008 a cadeia ficava quebrada (NodeNotFound).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('farmacia', '0004_materialrequisitionitem_product'),
        ('cirurgia', '0007_surgeons_employee_m2m'),
    ]

    operations = [
        migrations.AddField(
            model_name='surgicalprocedure',
            name='default_materials',
            field=models.ManyToManyField(
                blank=True,
                db_table='cirurgia_procedimento_materiais',
                related_name='cirurgia_procedimentos_padrao',
                to='farmacia.product',
                verbose_name='Materiais padrão',
            ),
        ),
    ]
