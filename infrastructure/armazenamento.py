class Armazenamento:
    def salvar(self, arquivo):
        pass

    def get_url(self, arquivo):
        return f"/media/{arquivo}"

    obter_url = get_url
