export type ProcedureHistoryRow = {
  procedure: string;
  status?: string;
  date?: string | null;
  href?: string;
};

function readableValue(value: any): string {
  if (value === null || value === undefined || value === "") return "";
  if (Array.isArray(value)) return value.map(readableValue).filter(Boolean).join(", ");
  if (typeof value === "object") {
    return String(
      value.name ||
        value.nome ||
        value.label ||
        value.title ||
        value.description ||
        value.procedure ||
        value.custom_id ||
        value.id_custom ||
        value.id ||
        ""
    ).trim();
  }
  return String(value).trim();
}

function joinReadable(values: any[]): string {
  return values.map(readableValue).filter(Boolean).join(", ");
}

function readableItems(value: any): string[] {
  if (Array.isArray(value)) return value.map(readableValue).filter(Boolean);
  const single = readableValue(value);
  return single ? [single] : [];
}

function compactText(value: any, max = 110): string {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return text.length <= max ? text : `${text.slice(0, max - 3)}...`;
}

function surgeryStatusLabel(value?: string | null): string {
  const normalized = String(value || "").trim().toUpperCase();
  const labels: Record<string, string> = {
    SURGERY_COMPLETED: "Cirurgia realizada",
    COMPLETED: "Realizada",
    DONE: "Realizada",
    REALIZADA: "Realizada",
    SCHEDULED: "Agendada",
    SURGERY_SCHEDULED: "Agendada",
    CANCELED: "Cancelada",
    SURGERY_CANCELED: "Cancelada",
  };
  return labels[normalized] || readableValue(value);
}

export function buildProcedureRows(largeSurgeries: any[], procedures: any[]): ProcedureHistoryRow[] {
  const surgeryRows = largeSurgeries.flatMap((surgery) => {
    const procedureNames = readableItems(surgery.procedure_names);
    const names = procedureNames.length
      ? procedureNames
      : readableItems(surgery.procedure || surgery.custom_id || `Cirurgia ${surgery.id}`);
    return names.map((name) => ({
      procedure: compactText(name, 90),
      status: surgeryStatusLabel(surgery.status),
      date: surgery.completed_at || surgery.ended_at || surgery.started_at || surgery.scheduled_for,
      href: `/surgery/large-surgeries/${surgery.id}`,
    }));
  });

  const nursingRows = procedures.map((procedure) => ({
    procedure: compactText(
      joinReadable([procedure.name || procedure.procedure_name || procedure.description, procedure.custom_id || procedure.id]) ||
        "Procedimento de enfermagem",
      90
    ),
    status: readableValue(procedure.status || procedure.estado || procedure.situacao),
    date: procedure.data_realizacao || procedure.performed_date || procedure.created_at,
    href: procedure.id ? `/nursing/procedures/${procedure.id}` : undefined,
  }));

  return [...surgeryRows, ...nursingRows].sort((a, b) => {
    const aTime = new Date(a.date || 0).getTime();
    const bTime = new Date(b.date || 0).getTime();
    return bTime - aTime;
  });
}
