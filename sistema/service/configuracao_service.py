from sistema.modelos.configuracao import ConfiguracaoSistema


class ConfiguracaoSistemaService:
    @staticmethod
    def esta_em_manutencao() -> bool:
        return ConfiguracaoSistema.obter().maintenance_mode

    @staticmethod
    def definir_manutencao(valor: bool):
        config = ConfiguracaoSistema.obter()
        config.maintenance_mode = valor
        config.save(update_fields=["maintenance_mode"])
