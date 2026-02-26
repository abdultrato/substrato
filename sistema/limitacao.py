class BurstRateThrottle(UserRateThrottle):
    scope = "burst"


class SustainedRateThrottle(UserRateThrottle):
    scope = "sustained"


class AnonBurstRateThrottle(AnonRateThrottle):
    scope = "anon_burst"
