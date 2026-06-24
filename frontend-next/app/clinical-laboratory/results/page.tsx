import { redirect } from "next/navigation";

// A entrada/validação de resultados foi consolidada no fluxo por requisição
// (Listas de Trabalho). Esta rota redirecciona para evitar duplicação.
export default function LabResultsPage() {
  redirect("/clinical-laboratory/worklists");
}
