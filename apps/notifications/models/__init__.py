from .delivery_log import DeliveryLog
from .notification import Notification
from .notification_template import NotificationTemplate

LogEnvio = DeliveryLog
Notificacao = Notification
TemplateNotificacao = NotificationTemplate

__all__ = [
    "DeliveryLog",
    "LogEnvio",
    "Notificacao",
    "Notification",
    "NotificationTemplate",
    "TemplateNotificacao",
]
