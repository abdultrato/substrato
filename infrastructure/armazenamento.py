class Armazenamento:
    def salvar(self, file):
        pass

    def get_url(self, file):
        return f"/media/{file}"

    obter_url = get_url
