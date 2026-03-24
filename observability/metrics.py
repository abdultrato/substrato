from django.utils.timezone import now

START_TIME = now()


def get_metrics():
    uptime = now() - START_TIME

    return {
        "uptime_seconds": int(uptime.total_seconds()),
    }
