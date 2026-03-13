from rest_framework.throttling import UserRateThrottle, AnonRateThrottle


class BurstRateThrottle(UserRateThrottle):
    scope = "burst"


class SustainedRateThrottle(UserRateThrottle):
    scope = "sustained"


class AnonBurstRateThrottle(AnonRateThrottle):
    scope = "anon_burst"
