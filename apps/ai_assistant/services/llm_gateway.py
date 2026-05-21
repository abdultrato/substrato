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
        denied_result = next((item for item in tool_results if (item.get("result") or {}).get("access_denied")), None)
        if denied_result:
            return self._access_denied_answer(denied_result.get("result") or {}, language=language)

        crud_result = next((item for item in tool_results if item.get("tool_name") == "prepare_crud_operation"), None)
        if crud_result:
            return self._crud_answer(crud_result.get("result") or {}, language=language)

        user_context_result = next((item for item in tool_results if item.get("tool_name") == "get_user_context"), None)
        data_explorer_result = next((item for item in tool_results if item.get("tool_name") == "explore_database"), None)
        if user_context_result and len(tool_results) == 1:
            return self._user_context_answer(user_context_result.get("result") or {}, language=language)
        if data_explorer_result and len(tool_results) == 1:
            return self._data_explorer_answer(data_explorer_result.get("result") or {}, language=language)
        if user_context_result and data_explorer_result and len(tool_results) == 2:
            return "\n\n".join(
                [
                    self._user_context_answer(user_context_result.get("result") or {}, language=language, compact=True),
                    self._data_explorer_answer(data_explorer_result.get("result") or {}, language=language),
                ]
            )

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

    def _user_context_answer(self, result: dict[str, Any], *, language: str, compact: bool = False) -> str:
        summary = result.get("summary") or {}
        user = summary.get("user") or {}
        tenant = summary.get("tenant") or {}
        modules = summary.get("accessible_modules") or []
        login = user.get("login") or "—"
        groups = user.get("groups") or []
        tenant_name = tenant.get("name") or tenant.get("identifier") or "—"

        module_labels = []
        for item in modules[:8]:
            module_labels.append(item.get("label_en") if language == "en" else item.get("label_pt"))
        module_text = ", ".join(label for label in module_labels if label) or ("none" if language == "en" else "nenhum")

        if language == "en":
            direct = f"You are authenticated as {login} in tenant {tenant_name}."
            if groups:
                direct += f" Your group(s): {', '.join(groups)}."
            if compact:
                return direct
            return "\n\n".join(
                [
                    direct,
                    f"Areas you can investigate now: {module_text}.",
                    summary.get("investigation_prompt_en")
                    or "Tell me what you want to investigate inside the project.",
                    "Internal evidence used: User, Tenant, Group and RBAC.",
                    "Limitation: I only query resources allowed by your current RBAC profile.",
                ]
            )

        direct = f"O utilizador autenticado é {login}, no tenant {tenant_name}."
        if groups:
            direct += f" Grupo(s): {', '.join(groups)}."
        if compact:
            return direct
        return "\n\n".join(
            [
                direct,
                f"Áreas que pode investigar agora: {module_text}.",
                summary.get("investigation_prompt_pt")
                or "Diga-me o que quer investigar dentro do projecto.",
                "Evidência interna usada: User, Tenant, Group e RBAC.",
                "Limitação: só consulto recursos autorizados pelo seu perfil RBAC actual.",
            ]
        )

    def _access_denied_answer(self, result: dict[str, Any], *, language: str) -> str:
        denied = result.get("denied_resources") or (result.get("summary") or {}).get("denied_resources") or []
        if denied:
            resources = ", ".join(
                (item.get("label_en") if language == "en" else item.get("label_pt")) or item.get("basename") or "resource"
                for item in denied[:4]
            )
        else:
            resources = "requested resource" if language == "en" else "recurso solicitado"

        if language == "en":
            return "\n\n".join(
                [
                    "I cannot do that because the authenticated user does not have access to the requested data.",
                    f"Blocked resource(s): {resources}.",
                    "Internal evidence used: RBAC and the API resource catalog.",
                    "Limitation: no operational data from the blocked resource was queried.",
                    "Suggested next step: ask an administrator to review your groups or permissions.",
                ]
            )
        return "\n\n".join(
            [
                "Não posso fazê-lo porque o utilizador autenticado não tem acesso aos dados solicitados.",
                f"Recurso(s) bloqueado(s): {resources}.",
                "Evidência interna usada: RBAC e catálogo de recursos da API.",
                "Limitação: nenhum dado operacional do recurso bloqueado foi consultado.",
                "Próximo passo sugerido: peça a um administrador para rever os seus grupos ou permissões.",
            ]
        )

    def _data_explorer_answer(self, result: dict[str, Any], *, language: str) -> str:
        summary = result.get("summary") or {}
        catalog = result.get("catalog") or summary.get("catalog") or []
        modules = result.get("accessible_modules") or summary.get("accessible_modules") or []
        resource_results = result.get("resource_results") or summary.get("resource_results") or []

        if catalog or modules:
            module_lines = []
            for item in modules[:10]:
                label = item.get("label_en") if language == "en" else item.get("label_pt")
                module_lines.append(f"- {label}: {item.get('resource_count', 0)}")
            if language == "en":
                direct = f"You can investigate {len(catalog)} resource(s) across {len(modules)} module(s)."
                prompt = summary.get("investigation_prompt_en") or "Choose a module or ask for a specific count/list."
                return "\n\n".join(
                    [
                        direct,
                        "Available areas:\n" + "\n".join(module_lines[:10]) if module_lines else "Available areas: none.",
                        prompt,
                        "Internal evidence used: RBAC and the API resource catalog.",
                        "Limitation: this catalog does not query raw records until you ask for a specific resource.",
                    ]
                )
            direct = f"Pode investigar {len(catalog)} recurso(s) em {len(modules)} módulo(s)."
            prompt = summary.get("investigation_prompt_pt") or "Escolha um módulo ou pergunte por uma contagem/listagem específica."
            return "\n\n".join(
                [
                    direct,
                    "Áreas disponíveis:\n" + "\n".join(module_lines[:10]) if module_lines else "Áreas disponíveis: nenhuma.",
                    prompt,
                    "Evidência interna usada: RBAC e catálogo de recursos da API.",
                    "Limitação: este catálogo não consulta registos brutos até pedir um recurso específico.",
                ]
            )

        lines = []
        for item in resource_results[:5]:
            label = item.get("label_en") if language == "en" else item.get("label_pt")
            count = item.get("filtered_count", 0)
            total = item.get("total_count", count)
            if language == "en":
                line = f"- {label}: {count} matching record(s), {total} total in your scope."
            else:
                line = f"- {label}: {count} registo(s) encontrados, {total} no total do seu escopo."
            records = item.get("records") or []
            if records:
                safe_refs = []
                for record in records[:3]:
                    safe_refs.append(str(record.get("custom_id") or record.get("student_code") or record.get("teacher_code") or record.get("id")))
                line += (" Safe sample: " if language == "en" else " Amostra segura: ") + ", ".join(safe_refs)
            lines.append(line)

        if language == "en":
            return "\n\n".join(
                [
                    "I queried only the database resources allowed by your RBAC profile.",
                    "\n".join(lines) if lines else "No matching records were found.",
                    "Internal evidence used: API resource catalog, tenant scope and RBAC.",
                    "Limitation: I returned counts and safe samples, not raw sensitive records.",
                    "Suggested next step: ask for a specific code/reference if you want a narrower investigation.",
                ]
            )
        return "\n\n".join(
            [
                "Consultei apenas os recursos da base de dados permitidos pelo seu perfil RBAC.",
                "\n".join(lines) if lines else "Nenhum registo correspondente foi encontrado.",
                "Evidência interna usada: catálogo de recursos da API, tenant e RBAC.",
                "Limitação: devolvi contagens e amostras seguras, não registos sensíveis brutos.",
                "Próximo passo sugerido: indique um código/referência específica se quiser uma investigação mais estreita.",
            ]
        )

    def _crud_answer(self, result: dict[str, Any], *, language: str) -> str:
        crud = result.get("crud") or {}
        status = crud.get("status") or ""
        resource = crud.get("resource") or {}
        label = resource.get("label_en") if language == "en" else resource.get("label_pt")
        label = label or ("resource" if language == "en" else "recurso")
        operation = crud.get("operation") or "create"
        operation_label = self._crud_operation_label(operation=operation, language=language)

        if status == "collecting":
            captured = crud.get("payload") or {}
            prompt = crud.get("prompt_en") if language == "en" else crud.get("prompt_pt")
            if language == "en":
                direct = f"I started a conversational {operation_label} flow for {label}."
                if captured:
                    direct += f" I already captured: {', '.join(captured.keys())}."
                return "\n\n".join(
                    [
                        direct,
                        prompt or "Send the missing fields and I will prepare the action for confirmation.",
                        "Internal evidence used: API resource catalog, serializer field metadata and RBAC.",
                        "Limitation: nothing was written yet. The record will only be changed after explicit confirmation.",
                    ]
                )
            direct = f"Iniciei o fluxo conversacional de {operation_label} para {label}."
            if captured:
                direct += f" Já recolhi: {', '.join(captured.keys())}."
            return "\n\n".join(
                [
                    direct,
                    prompt or "Envie os campos em falta e preparo a acção para confirmação.",
                    "Evidência interna usada: catálogo da API, metadados do serializer e RBAC.",
                    "Limitação: nada foi gravado ainda. O registo só muda depois de confirmação explícita.",
                ]
            )

        if status == "needs_resource":
            prompt = crud.get("prompt_en") if language == "en" else crud.get("prompt_pt")
            if language == "en":
                return "\n\n".join(
                    [
                        "I understood the CRUD intent, but I still need the target resource.",
                        prompt or "Tell me which module/resource should receive this operation.",
                        "Internal evidence used: API resource catalog.",
                    ]
                )
            return "\n\n".join(
                [
                    "Entendi a intenção de CRUD, mas ainda preciso do recurso de destino.",
                    prompt or "Diga em que módulo/recurso devo executar esta operação.",
                    "Evidência interna usada: catálogo de recursos da API.",
                ]
            )

        if status == "unavailable":
            prompt = crud.get("prompt_en") if language == "en" else crud.get("prompt_pt")
            if language == "en":
                return "\n\n".join(
                    [
                        f"I cannot prepare this {operation_label} action for {label}.",
                        prompt or "This resource does not accept this manual operation.",
                        "Internal evidence used: API resource catalog, ViewSet workflow and RBAC.",
                        "Limitation: no write action was created.",
                    ]
                )
            return "\n\n".join(
                [
                    f"Não posso preparar esta acção de {operation_label} para {label}.",
                    prompt or "Este recurso não aceita esta operação manual.",
                    "Evidência interna usada: catálogo da API, fluxo do ViewSet e RBAC.",
                    "Limitação: nenhuma acção de escrita foi criada.",
                ]
            )

        if status == "ready":
            payload = crud.get("payload") or {}
            if language == "en":
                return "\n\n".join(
                    [
                        f"I prepared the {operation_label} action for {label}.",
                        f"Fields to apply: {', '.join(payload.keys()) or 'none'}. Use the confirmation button to execute it.",
                        "Internal evidence used: API resource catalog, serializer validation metadata and RBAC.",
                        "Limitation: the write is still pending. Confirmation revalidates tenant and permissions before touching the database.",
                    ]
                )
            return "\n\n".join(
                [
                    f"Preparei a acção de {operation_label} para {label}.",
                    f"Campos a aplicar: {', '.join(payload.keys()) or 'nenhum'}. Use o botão de confirmação para executar.",
                    "Evidência interna usada: catálogo da API, metadados de validação do serializer e RBAC.",
                    "Limitação: a escrita ainda está pendente. A confirmação revalida tenant e permissões antes de tocar na base de dados.",
                ]
            )

        if language == "en":
            return "I did not find a complete CRUD operation to prepare."
        return "Não encontrei uma operação de CRUD completa para preparar."

    def _crud_operation_label(self, *, operation: str, language: str) -> str:
        labels = {
            "create": ("criação", "creation"),
            "update": ("alteração", "update"),
            "delete": ("remoção", "deletion"),
        }
        pt, en = labels.get(operation, (operation, operation))
        return en if language == "en" else pt

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

            if summary.get("resource_results"):
                lines.append("Data resources:" if language == "en" else "Recursos de dados:")
                for resource in summary.get("resource_results", [])[:4]:
                    label = resource.get("label_en") if language == "en" else resource.get("label_pt")
                    if language == "en":
                        lines.append(f"- {label}: {resource.get('filtered_count', 0)} record(s).")
                    else:
                        lines.append(f"- {label}: {resource.get('filtered_count', 0)} registo(s).")

            if summary.get("catalog"):
                lines.append(
                    "The allowed data catalog is included in the payload."
                    if language == "en"
                    else "O catálogo de dados permitido está incluído no payload."
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
