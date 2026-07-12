"use client";

import { isNotFoundLikeError } from "@/lib/errors/api-error";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, ClipboardList, FileText } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import ActionTile from "@/components/ui/ActionTile";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetch, extractTotalCount } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

export default function NotificacoesPage() {
  const safeRefreshToken = useSafeDataRefreshSignal();
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [notificacoes, setNotificacoes] = useState<number>(0);
  const [logs, setLogs] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setErro(null);

        const [n, l] = await Promise.all([
          apiFetch<any>("/notifications/notification/", {
            clientCache: safeRefreshToken === 0,
          }),
          apiFetch<any>("/notifications/logenvio/", {
            clientCache: safeRefreshToken === 0,
          }),
        ]);

        if (!mounted) return;
        setNotificacoes(extractTotalCount(n));
        setLogs(extractTotalCount(l));
      } catch (e: any) {
        if (!mounted) return;
        setErro(
          isNotFoundLikeError(e)
            ? null
            : e?.message || "Falha ao carregar notificações.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [safeRefreshToken]);

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN]}>
      <div className="space-y-6">
        <PageHeader
          title="Notificações"
          subtitle="Envios por e-mail/SMS/WhatsApp e rastreabilidade."
        />

        {erro ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Notificações"
            value={loading ? "..." : notificacoes}
          />
          <MetricCard label="Logs de envio" value={loading ? "..." : logs} />
          <MetricCard label="Canal e-mail" value="—" hint="Config via env" />
          <MetricCard label="Canal WhatsApp" value="—" hint="Config via env" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionTile
            title="Notificações"
            description="Lista e auditoria das mensagens enviadas."
            href="/notifications/notifications"
            icon={Bell}
          />
          <ActionTile
            title="Logs de envio"
            description="Status (sucesso/erro/ignorado) e resposta do provedor."
            href="/notifications/logs"
            icon={FileText}
          />
          <ActionTile
            title="Gerenciamento (API)"
            description="Acesso direto à interface genérica do módulo."
            href="/notifications/notifications"
            icon={ClipboardList}
          />
        </div>

        <Card
          title="Nota"
          subtitle="Envio real depende de configuração de SMTP/WhatsApp."
        >
          <div className="text-sm text-slate-700">
            O sistema registra notificação e log mesmo quando o canal está
            desativado por configuração.
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
