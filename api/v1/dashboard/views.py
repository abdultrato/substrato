from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from aplicativos.clinico.modelos.paciente import Paciente
from aplicativos.clinico.modelos.requisicao_analise import RequisicaoAnalise
from aplicativos.faturamento.modelos.fatura import Fatura
from dominio.clinico.estado_resultado import EstadoResultado
from seguranca.permissoes.grupos import IsAdminOrContabilidade


class DashboardStatsView(APIView):
	permission_classes = [IsAdminOrContabilidade]

	def get(self, request):
		inquilino = getattr(request, "inquilino", None)

		pacientes_qs = Paciente.objects.all()
		requisicoes_qs = RequisicaoAnalise.objects.all()
		faturas_qs = Fatura.objects.all()

		if inquilino is not None:
			pacientes_qs = pacientes_qs.filter(inquilino=inquilino)
			requisicoes_qs = requisicoes_qs.filter(inquilino=inquilino)
			faturas_qs = faturas_qs.filter(inquilino=inquilino)

		hoje = timezone.localdate()

		pacientes = pacientes_qs.count()
		requisicoes_pendentes = requisicoes_qs.filter(
			estado=EstadoResultado.PENDENTE
		).count()
		exames_hoje = requisicoes_qs.filter(criado_em__date=hoje).count()

		faturamento_hoje = (
			faturas_qs.filter(criado_em__date=hoje).aggregate(total=Sum("total"))[
				"total"
			]
			or Decimal("0.00")
		)

		return Response(
			{
				"pacientes": pacientes,
				"requisicoes_pendentes": requisicoes_pendentes,
				"exames_hoje": exames_hoje,
				"faturamento_hoje": float(faturamento_hoje),
			}
		)
