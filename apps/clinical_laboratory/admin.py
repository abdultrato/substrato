from django.contrib import admin

from .models import (
    CriticalResultNotification,
    LabOrder,
    LabOrderItem,
    LabReport,
    LabResult,
    LabSample,
    LabSector,
    LabTest,
    LabTestPanel,
    LabWorklist,
    ResultValidation,
    SampleCollection,
    SampleReception,
    SampleRejection,
)

for _model in (
    LabSector, LabTest, LabTestPanel, LabOrder, LabOrderItem, SampleCollection,
    LabSample, SampleReception, SampleRejection, LabWorklist, LabResult,
    ResultValidation, LabReport, CriticalResultNotification,
):
    try:
        admin.site.register(_model)
    except admin.sites.AlreadyRegistered:
        pass
