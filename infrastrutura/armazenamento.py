class Armazenamento:

    def salvar(self, arquivo):
        print("Arquivo salvo")

    def obter_url(self, arquivo):
        return f"/media/{arquivo}"
