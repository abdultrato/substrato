from dominio.seguradora.regras_coparticipacao import calcular_coparticipacao
from servicos.seguradora.servico_resolucao_plano import ServicoResolucaoPlano


class ServicoCoparticipacao:
    @staticmethod
    def calcular(inquilino, plano_global, valor_total):

        plano_efetivo = ServicoResolucaoPlano.obter_plano_efetivo(inquilino, plano_global)

        percentual = plano_efetivo.percentual_final()

        return calcular_coparticipacao(valor_total, percentual)
