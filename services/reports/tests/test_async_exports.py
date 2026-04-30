from services.reports.async_exports import (
    can_access_export_job,
    create_export_job,
    get_export_job_result,
    get_export_job_state,
    mark_export_job_processing,
    mark_export_job_ready,
)


def test_export_job_lifecycle_ready_result():
    state = create_export_job(
        export_key="analytics_pdf",
        payload={"kpis": {"a": 1}},
        tenant_id=99,
        user_id=7,
    )
    job_id = state["id"]

    loaded = get_export_job_state(job_id)
    assert loaded is not None
    assert loaded["status"] == "queued"

    mark_export_job_processing(job_id)
    processing = get_export_job_state(job_id)
    assert processing is not None
    assert processing["status"] == "processing"

    mark_export_job_ready(
        job_id,
        file_bytes=b"pdf-content",
        filename="teste.pdf",
        content_type="application/pdf",
    )
    ready = get_export_job_state(job_id)
    assert ready is not None
    assert ready["status"] == "ready"

    result = get_export_job_result(job_id)
    assert result is not None
    file_bytes, filename, content_type = result
    assert file_bytes == b"pdf-content"
    assert filename == "teste.pdf"
    assert content_type == "application/pdf"


def test_export_job_access_control_by_tenant_and_user():
    state = create_export_job(
        export_key="invoice_pdf",
        payload={"invoice_id": 123},
        tenant_id=11,
        user_id=22,
    )

    assert can_access_export_job(state, tenant_id=11, user_id=22, is_superuser=False)
    assert not can_access_export_job(state, tenant_id=10, user_id=22, is_superuser=False)
    assert not can_access_export_job(state, tenant_id=11, user_id=21, is_superuser=False)
    assert can_access_export_job(state, tenant_id=None, user_id=None, is_superuser=True)
