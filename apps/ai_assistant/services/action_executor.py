from __future__ import annotations

from django.utils import timezone
from django.utils.dateparse import parse_datetime

from apps.ai_assistant.models import AiOperationalTask, AiSuggestedAction
from services.reports.async_exports import create_export_job, mark_export_job_processing, mark_export_job_ready

from .report_builder import build_operational_report_file


class AiActionExecutionError(Exception):
    pass


class AiActionExecutor:
    """Executa somente acções já revalidadas e confirmadas pelo endpoint dedicado."""

    def execute(self, *, action: AiSuggestedAction, user, tenant) -> AiSuggestedAction:
        if action.action_type == "open_filtered_navigation":
            return self._execute_navigation(action=action, user=user)
        if action.action_type == "prepare_ai_report_export":
            return self._execute_report_export(action=action, user=user, tenant=tenant)
        if action.action_type == "create_operational_task":
            return self._execute_operational_task(action=action, user=user, tenant=tenant)
        action.status = AiSuggestedAction.Status.FAILED
        action.result_summary = "Tipo de acção ainda não tem executor confirmado."
        action.save(update_fields=["status", "result_summary", "updated_at"])
        raise AiActionExecutionError("Executor ainda não implementado para esta acção.")

    def _execute_navigation(self, *, action: AiSuggestedAction, user) -> AiSuggestedAction:
        now = timezone.now()
        action.status = AiSuggestedAction.Status.CONFIRMED
        action.confirmed_by = user
        action.confirmed_at = now
        action.executed_at = now
        action.result_summary = "Navegação preparada."
        action.save(
            update_fields=[
                "status",
                "confirmed_by",
                "confirmed_at",
                "executed_at",
                "result_summary",
                "updated_at",
            ]
        )
        return action

    def _execute_operational_task(self, *, action: AiSuggestedAction, user, tenant) -> AiSuggestedAction:
        payload = action.payload or {}
        due_at = None
        if payload.get("due_at"):
            due_at = parse_datetime(str(payload.get("due_at")))
        priority = str(payload.get("priority") or AiOperationalTask.Priority.NORMAL)
        if priority not in {choice[0] for choice in AiOperationalTask.Priority.choices}:
            priority = AiOperationalTask.Priority.NORMAL

        task = AiOperationalTask.objects.create(
            tenant=tenant,
            session=action.session,
            action=action,
            created_by=user,
            assigned_group=str(payload.get("assigned_group") or "Administrador")[:120],
            module_key=str(payload.get("module_key") or "")[:80],
            title=str(payload.get("title") or payload.get("title_pt") or "Tarefa operacional da IA")[:180],
            description=str(payload.get("description") or "")[:4000],
            priority=priority,
            status=AiOperationalTask.Status.OPEN,
            due_at=due_at,
            source_type=str(payload.get("source_type") or "ai_chat")[:120],
            source_reference=str(payload.get("source_reference") or "")[:180],
            metadata={
                "ai_action_id": action.id,
                "ai_session_id": action.session_id,
                "prepared_payload": payload,
            },
        )

        now = timezone.now()
        href = f"/ai/tasks?task={task.id}"
        action.status = AiSuggestedAction.Status.CONFIRMED
        action.confirmed_by = user
        action.confirmed_at = now
        action.executed_at = now
        action.result_summary = f"Tarefa operacional criada: {task.custom_id or task.id}"
        action.result_href = href
        action.payload = {
            **payload,
            "operational_task_id": task.id,
            "operational_task_custom_id": task.custom_id,
            "href": href,
        }
        action.save(
            update_fields=[
                "status",
                "confirmed_by",
                "confirmed_at",
                "executed_at",
                "result_summary",
                "result_href",
                "payload",
                "updated_at",
            ]
        )
        return action

    def _execute_report_export(self, *, action: AiSuggestedAction, user, tenant) -> AiSuggestedAction:
        payload = action.payload or {}
        language = "en" if payload.get("language") == "en" else "pt"
        state = create_export_job(
            export_key="ai_operational_report",
            payload=payload,
            tenant_id=getattr(tenant, "id", None),
            user_id=getattr(user, "id", None),
            content_disposition="attachment",
        )
        job_id = state["id"]
        mark_export_job_processing(job_id)
        file_bytes, filename, content_type = build_operational_report_file(
            payload=payload,
            tenant=tenant,
            user=user,
            language=language,
        )
        ready_state = mark_export_job_ready(
            job_id,
            file_bytes=file_bytes,
            filename=filename,
            content_type=content_type,
        )
        if not ready_state:
            action.status = AiSuggestedAction.Status.FAILED
            action.result_summary = "Falha ao finalizar o job de exportação."
            action.save(update_fields=["status", "result_summary", "updated_at"])
            raise AiActionExecutionError("Falha ao finalizar o job de exportação.")

        now = timezone.now()
        download_href = f"/api/v1/monitoring/export_job/{job_id}/download/"
        status_href = f"/api/v1/monitoring/export_job/{job_id}/"
        action.status = AiSuggestedAction.Status.CONFIRMED
        action.confirmed_by = user
        action.confirmed_at = now
        action.executed_at = now
        action.result_summary = f"Relatório gerado: {filename}"
        action.result_href = download_href
        action.payload = {
            **payload,
            "export_job_id": job_id,
            "status_href": status_href,
            "download_href": download_href,
            "filename": filename,
        }
        action.save(
            update_fields=[
                "status",
                "confirmed_by",
                "confirmed_at",
                "executed_at",
                "result_summary",
                "result_href",
                "payload",
                "updated_at",
            ]
        )
        return action
