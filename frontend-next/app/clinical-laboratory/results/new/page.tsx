import { redirect } from "next/navigation";

// Criação de resultados ocorre dentro da requisição (Listas de Trabalho).
export default function Page() {
  redirect("/clinical-laboratory/worklists");
}
