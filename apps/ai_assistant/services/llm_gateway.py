from __future__ import annotations

from typing import Any


class LocalLlmGateway:
    """
    Gateway determinístico local.

    Mantém a arquitectura pronta para provedor externo, mas evita enviar dados
    sensíveis a terceiros enquanto as políticas e ferramentas ainda amadurecem.
    """

    provider = "local"

    def build_answer(
        self,
        *,
        question: str,
        language: str,
        tool_results: list[dict[str, Any]],
        blocked_tools: list[dict[str, Any]] | None = None,
    ) -> str:
        blocked_tools = blocked_tools or []
        command_result = next((item for item in tool_results if item.get("tool_name") == "get_command_center_alerts"), None)
        if command_result and len(tool_results) == 1:
            return self._command_center_answer(command_result.get("result") or {}, language=language)

        if command_result and len(tool_results) > 1:
            other_results = [item for item in tool_results if item.get("tool_name") != "get_command_center_alerts"]
            return "\n\n".join(
                [
                    self._command_center_answer(command_result.get("result") or {}, language=language),
                    self._generic_tool_answer(other_results, language=language),
                ]
            )

        if tool_results:
            return self._generic_tool_answer(tool_results, language=language)

        if blocked_tools:
            if language == "en":
                return (
                    "I could not run the requested operational tool because your current permissions do not allow it.\n\n"
                    "Internal evidence used: AI policy guard.\n"
                    "Limitation: no operational data was queried after the policy block.\n"
                    "Suggested next step: ask an administrator to review your access profile."
                )
            return (
                "Não consegui executar a ferramenta operacional solicitada porque o seu perfil actual não tem permissão.\n\n"
                "Evidência interna usada: guarda de política da IA.\n"
                "Limitação: nenhum dado operacional foi consultado depois do bloqueio de política.\n"
                "Próximo passo sugerido: peça a um administrador para rever o seu perfil de acesso."
            )

        if language == "en":
            return (
                "This first AI increment can answer operational Command Center questions: active alerts, 5xx routes, SLO state and outbox backlog.\n\n"
                "Internal evidence used: tool registry.\n"
                "Limitation: I only run tools that match the question and your RBAC profile.\n"
                "Suggested next step: ask about active alerts, clinical requests, nursing pending work, finance, pharmacy or education."
            )
        return (
            "Este primeiro incremento da IA responde a perguntas operacionais do Command Center: alertas activos, rotas 5xx, estado de SLO e backlog da outbox.\n\n"
            "Evidência interna usada: registry de ferramentas.\n"
            "Limitação: só executo ferramentas que correspondem à pergunta e ao seu perfil RBAC.\n"
            "Próximo passo sugerido: pergunte por alertas activos, requisições clínicas, pendências de enfermagem, financeiro, farmácia ou educação."
        )

    def _command_center_answer(self, result: dict[str, Any], *, language: str) -> str:
        totals = result.get("global_totals") or {}
        alerts = result.get("alerts") or []
        routes = result.get("top_failing_routes") or []
        modules = result.get("modules") or []
        outbox = result.get("outbox") or {}
        days = (result.get("range") or {}).get("days") or 7

        if language == "en":
            direct = (
                f"I found {len(alerts)} active operational alert(s) in the last {days} day(s). "
                f"There are {totals.get('server_5xx', 0)} 5xx failures, {totals.get('client_4xx', 0)} 4xx errors, "
                f"and {totals.get('modules_below_slo', 0)} module(s) below target."
            )
            if routes:
                direct += f" The most critical route is {routes[0].get('path')}, with {routes[0].get('server_5xx')} 5xx failures."
            if outbox.get("failed_or_dead_letter"):
                direct += f" The outbox has {outbox.get('failed_or_dead_letter')} failed or dead-letter events."
            elif outbox.get("pending"):
                direct += f" The outbox has {outbox.get('pending')} pending event(s)."

            evidence = "Internal evidence used: Command Center, SystemError, UserActivity and TransactionalOutboxEvent."
            limitations = "Limitation: I did not query infrastructure logs outside the application database."
            next_step = f"Suggested next step: open Command Center filtered to {days} day(s) and investigate the first critical route or module."
            module_text = self._module_summary(modules, language="en")
            return "\n\n".join(part for part in [direct, module_text, evidence, limitations, next_step] if part)

        direct = (
            f"Encontrei {len(alerts)} alerta(s) operacional(is) activo(s) nos últimos {days} dia(s). "
            f"Existem {totals.get('server_5xx', 0)} falhas 5xx, {totals.get('client_4xx', 0)} erros 4xx "
            f"e {totals.get('modules_below_slo', 0)} módulo(s) abaixo da meta."
        )
        if routes:
            direct += f" A rota mais crítica é {routes[0].get('path')}, com {routes[0].get('server_5xx')} falhas 5xx."
        if outbox.get("failed_or_dead_letter"):
            direct += f" A outbox tem {outbox.get('failed_or_dead_letter')} evento(s) falhado(s) ou em dead letter."
        elif outbox.get("pending"):
            direct += f" A outbox tem {outbox.get('pending')} evento(s) pendente(s)."

        evidence = "Evidência interna usada: Command Center, SystemError, UserActivity e TransactionalOutboxEvent."
        limitations = "Limitação: não consultei logs de infraestrutura fora da base de dados da aplicação."
        next_step = f"Próximo passo sugerido: abrir o Command Center filtrado para {days} dia(s) e investigar primeiro a rota ou módulo crítico."
        module_text = self._module_summary(modules, language="pt")
        return "\n\n".join(part for part in [direct, module_text, evidence, limitations, next_step] if part)

    def _module_summary(self, modules: list[dict[str, Any]], *, language: str) -> str:
        affected = [item for item in modules if item.get("slo_state") in {"critical", "warning"}]
        if not affected:
            return (
                "Module summary: no module is currently below the target among the returned data."
                if language == "en"
                else "Resumo por módulo: nenhum módulo está abaixo da meta nos dados retornados."
            )

        lines = []
        for item in affected[:4]:
            label = item.get("label_en") if language == "en" else item.get("label_pt")
            if language == "en":
                lines.append(
                    f"- {label}: {item.get('slo_state')}, success {item.get('success_rate')}%, 5xx {item.get('server_5xx')}."
                )
            else:
                lines.append(
                    f"- {label}: {item.get('slo_state')}, sucesso {item.get('success_rate')}%, 5xx {item.get('server_5xx')}."
                )
        title = "Affected modules:" if language == "en" else "Módulos afectados:"
        return "\n".join([title, *lines])

    def _generic_tool_answer(self, tool_results: list[dict[str, Any]], *, language: str) -> str:
        sections = []
        source_labels = []

        for item in tool_results:
            result = item.get("result") or {}
            summary = result.get("summary") or {}
            title = summary.get("title_en") if language == "en" else summary.get("title_pt")
            title = title or item.get("tool_name") or "Tool"
            metrics = summary.get("metrics") or []

            lines = [str(title)]
            for metric in metrics[:8]:
                label = metric.get("label_en") if language == "en" else metric.get("label_pt")
                lines.append(f"- {label}: {metric.get('value')}")

            guidance = summary.get("collection_guidance") or []
            if guidance:
                lines.append("Collection guidance:" if language == "en" else "Guia de colheita:")
                for exam in guidance[:5]:
                    exam_name = exam.get("exam_name") or exam.get("exam_code") or "Exam"
                    samples = exam.get("sample_options") or []
                    if not samples:
                        lines.append(f"- {exam_name}: no configured sample options." if language == "en" else f"- {exam_name}: sem opções de amostra configuradas.")
                        continue
                    sample_parts = []
                    for sample in samples[:4]:
                        sample_parts.append(
                            f"{sample.get('sample_name')} / {sample.get('bottle_type_label')} / {sample.get('minimum_volume_ml')} ml"
                        )
                    lines.append(f"- {exam_name}: " + "; ".join(sample_parts))

            if summary.get("recent_requests"):
                lines.append(
                    "Recent requests are included in the tool payload for navigation."
                    if language == "en"
                    else "As requisições recentes estão incluídas no payload da ferramenta para navegação."
                )

            if result.get("prepared_action"):
                action_type = (result.get("prepared_action") or {}).get("action_type")
                if action_type == "create_operational_task":
                    lines.append(
                        "Prepared action: confirm the button to create the operational task."
                        if language == "en"
                        else "Acção preparada: confirme o botão para criar a tarefa operacional."
                    )
                else:
                    lines.append(
                        "Prepared action: confirm the report generation button to create the export file."
                        if language == "en"
                        else "Acção preparada: confirme o botão de geração de relatório para criar o ficheiro exportável."
                    )

            sections.append("\n".join(lines))
            for source in result.get("sources") or []:
                label = source.get("label")
                if label and label not in source_labels:
                    source_labels.append(label)

        evidence = (
            f"Internal evidence used: {', '.join(source_labels) or 'internal tools'}."
            if language == "en"
            else f"Evidência interna usada: {', '.join(source_labels) or 'ferramentas internas'}."
        )
        limitation = (
            "Limitation: I returned operational summaries and did not expose raw sensitive records."
            if language == "en"
            else "Limitação: devolvi resumos operacionais e não expus registos sensíveis brutos."
        )
        next_step = (
            "Suggested next step: open the linked module and apply the filters shown by the assistant."
            if language == "en"
            else "Próximo passo sugerido: abrir o módulo indicado e aplicar os filtros sugeridos pela IA."
        )
        return "\n\n".join([*sections, evidence, limitation, next_step])
