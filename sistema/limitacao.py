from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class BurstRateThrottle(UserRateThrottle):
    """
    Protege contra picos abusivos.
    """

    scope = "burst"


class SustainedRateThrottle(UserRateThrottle):
    """
    Proteções de uso contínuo.
    """

    scope = "sustained"


class AnonBurstRateThrottle(AnonRateThrottle):
    scope = "anon_burst"
