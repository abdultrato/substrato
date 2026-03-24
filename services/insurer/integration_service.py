class InsurerIntegrationService:
    ADAPTERS = {
        "UNIMED": "integrations.insurers.unimed_adapter.UnimedAdapter",
    }

    @staticmethod
    def get_adapter(insurer):
        path = InsurerIntegrationService.ADAPTERS.get(insurer.identificador)

        if not path:
            raise LookupError("Insurer adapter is not configured.")

        module, cls = path.rsplit(".", 1)
        mod = __import__(module, fromlist=[cls])
        return getattr(mod, cls)()


ServicoIntegracaoSeguradora = InsurerIntegrationService
InsurerIntegrationService.obter_adapter = InsurerIntegrationService.get_adapter
