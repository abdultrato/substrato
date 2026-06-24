import { redirect } from "next/navigation";

// Detalhe consolidado no fluxo por requisição (Listas de Trabalho).
export default function Page() {
  redirect("/clinical-laboratory/worklists");
}
