import { describe, expect, it } from "vitest";

import { buildProcedureRows } from "../lib/nursing/wardAdmissionHistory";

describe("ward admission history helpers", () => {
  it("includes every surgery and nursing procedure row", () => {
    const rows = buildProcedureRows(
      [
        {
          id: 8,
          custom_id: "SURG-1",
          procedure_names: ["Amputação", "Apendicectomia"],
          status: "SURGERY_COMPLETED",
          completed_at: "2026-07-08T12:44:00Z",
        },
      ],
      [
        { name: "Curativo", status: "Concluído", data_realizacao: "2026-07-07T10:00:00Z" },
        { name: "Medicação", status: "Pendente", created_at: "2026-07-06T08:00:00Z" },
      ]
    );

    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.procedure)).toEqual([
      "Amputação",
      "Apendicectomia",
      "Curativo",
      "Medicação",
    ]);
  });
});
