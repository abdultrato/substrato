from system.models.configuration import SystemConfiguration


class SystemConfigurationService:
    @staticmethod
    def is_in_maintenance() -> bool:
        return SystemConfiguration.get().maintenance_mode

    @staticmethod
    def set_maintenance(value: bool):
        config = SystemConfiguration.get()
        config.maintenance_mode = value
        config.save(update_fields=["maintenance_mode"])


ConfiguracaoSistemaService = SystemConfigurationService
SystemConfigurationService.esta_em_manutencao = staticmethod(SystemConfigurationService.is_in_maintenance)
SystemConfigurationService.definir_manutencao = staticmethod(SystemConfigurationService.set_maintenance)
