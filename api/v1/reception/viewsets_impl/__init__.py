from .core import VIEWSET_MAP, ReceptionCareViewSet, ReceptionCheckinViewSet, ReceptionWorkspaceViewSet

__all__ = [
    "VIEWSET_MAP",
    "ReceptionCareViewSet",
    "ReceptionCheckinViewSet",
    "ReceptionWorkspaceViewSet",
]


AtendimentoRecepcaoViewSet = ReceptionCareViewSet
CheckinRecepcaoViewSet = ReceptionCheckinViewSet
WorkspaceRecepcaoViewSet = ReceptionWorkspaceViewSet
