from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class BurstRateThrottle(UserRateThrottle):
    """
    Limite agressivo para proteger contra picos.
    """

    scope = "burst"


class SustainedRateThrottle(UserRateThrottle):
    """
    Controle de uso contínuo.
    """

    scope = "sustained"


class AnonBurstRateThrottle(AnonRateThrottle):
    """
    Proteção para usuários não autenticados.
    """

    scope = "anon_burst"


class LoginRateThrottle(AnonRateThrottle):
    """
    Proteção específica para endpoint de login.
    """

    scope = "login"
