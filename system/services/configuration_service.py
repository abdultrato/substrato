from system.maintenance import ativar, desativar, esta_active


class SystemConfigurationService:
    @staticmethod
    def is_in_maintenance() -> bool:
        return esta_active()

    @staticmethod
    def set_maintenance(value: bool):
        if value:
            ativar()
            return

        desativar()


ConfiguracaoSistemaService = SystemConfigurationService
SystemConfigurationService.esta_em_manutencao = staticmethod(SystemConfigurationService.is_in_maintenance)
SystemConfigurationService.definir_manutencao = staticmethod(SystemConfigurationService.set_maintenance)
