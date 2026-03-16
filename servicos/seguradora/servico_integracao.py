class ServicoIntegracaoSeguradora:
    ADAPTERS = {
        "UNIMED": "integracoes.seguradoras.unimed_adapter.UnimedAdapter",
    }

    @staticmethod
    def obter_adapter(seguradora):

        path = ServicoIntegracaoSeguradora.ADAPTERS.get(seguradora.identificador)

        if not path:
            raise Exception("Adapter não configurado")

        module, cls = path.rsplit(".", 1)
        mod = __import__(module, fromlist=[cls])
        return getattr(mod, cls)()
