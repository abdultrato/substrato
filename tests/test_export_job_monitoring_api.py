from types import SimpleNamespace

from rest_framework.test import APIRequestFactory, force_authenticate

from api.v1.monitoring.viewsets_impl.core import ExportJobViewSet
from services.reports.async_exports import create_export_job


def test_export_job_collection_lists_accessible_jobs():
    user = SimpleNamespace(id=22001, is_superuser=False, is_authenticated=True)
    tenant = SimpleNamespace(id=11001)
    own = create_export_job(
        export_key="invoice_pdf",
        payload={"invoice_id": 1},
        tenant_id=tenant.id,
        user_id=user.id,
    )
    blocked = create_export_job(
        export_key="invoice_pdf",
        payload={"invoice_id": 2},
        tenant_id=tenant.id,
        user_id=user.id + 1,
    )

    request = APIRequestFactory().get("/api/v1/monitoring/export_job/")
    request.tenant = tenant
    force_authenticate(request, user=user)

    response = ExportJobViewSet.as_view({"get": "list"})(request)
    result_ids = {item["id"] for item in response.data["results"]}

    assert response.status_code == 200
    assert response.data["count"] == len(response.data["results"])
    assert own["id"] in result_ids
    assert blocked["id"] not in result_ids
    assert any(
        item["status_url"].endswith(f"/api/v1/monitoring/export_job/{own['id']}/")
        for item in response.data["results"]
    )
