from dominio.seguradora.motor_cobertura import resolver_regra


class ServicoCobertura:
    @staticmethod
    def resolver(plano, codigo_exame=None, cid=None):

        regras = plano.regras.filter(ativo=True)

        regra = resolver_regra(regras, codigo_exame, cid)

        if not regra:
            return {
                "percentual": plano.percentual_cobertura,
                "exige_autorizacao": plano.exige_autorizacao,
            }

        return {
            "percentual": regra.percentual_cobertura or plano.percentual_cobertura,
            "exige_autorizacao": regra.exige_autorizacao,
        }
