from django.contrib import admin
from .modelos.paciente import Paciente
from .modelos.requisicao_exame import RequisicaoExame
from .modelos.amostra import Amostra
from .modelos.resultado import Resultado

admin.site.register(Paciente)
admin.site.register(RequisicaoExame)
admin.site.register(Amostra)
admin.site.register(Resultado)
