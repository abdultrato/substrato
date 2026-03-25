from django.contrib import admin

from .models.consultation_specialty import ConsultationSpecialty
from .models.holiday import Holiday
from .models.medical_consultation import MedicalConsultation


class CoreAdmin(admin.ModelAdmin):
    list_filter = ("deletado",)
    search_fields = ("id_custom",)
    readonly_fields = ("criado_em", "atualizado_em")
    ordering = ("-criado_em",)


@admin.register(MedicalConsultation)
class MedicalConsultationAdmin(CoreAdmin):
    list_display = (
        "agendada_para",
        "paciente",
        "medico",
        "especialidade",
        "tipo",
        "estado",
        "preco",
        "tipo_horario",
        "feriado_manual",
    )
    list_filter = ("estado", "tipo_horario", "feriado_manual", "tipo")
    search_fields = ("tipo", "paciente__nome", "medico__nome")
    ordering = ("-agendada_para", "-criado_em")


@admin.register(ConsultationSpecialty)
class ConsultationSpecialtyAdmin(CoreAdmin):
    list_display = ("nome", "preco_base", "iva_percentual", "ativo", "inquilino", "criado_em")
    list_filter = ("ativo",)
    search_fields = ("nome",)
    ordering = ("nome",)


@admin.register(Holiday)
class HolidayAdmin(CoreAdmin):
    list_display = ("data", "descricao", "ativo", "inquilino", "criado_em")
    list_filter = ("ativo", "data")
    search_fields = ("descricao",)
    ordering = ("-data", "-criado_em")


ConsultaMedicaAdmin = MedicalConsultationAdmin
EspecialidadeConsultaAdmin = ConsultationSpecialtyAdmin
FeriadoAdmin = HolidayAdmin
