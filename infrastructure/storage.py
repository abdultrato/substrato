"""Interface de armazenamento genérica para uploads/arquivos."""

class Storage:
    """Define operações mínimas esperadas de um backend de storage."""

    def save(self, file):
        pass

    def get_url(self, file):
        return f"/media/{file}"
