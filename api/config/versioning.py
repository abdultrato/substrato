from rest_framework.versioning import NamespaceVersioning


class APIVersioning(NamespaceVersioning):
    """
    Versionamento corporativo da API.

    Permite evolução sem quebrar o frontend.
    Ex:
        /api/v1/pacientes/
        /api/v2/pacientes/
    """

    default_version = "v1"
    allowed_versions = ["v1"]
    version_param = "version"
