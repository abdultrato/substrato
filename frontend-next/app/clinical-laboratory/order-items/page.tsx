import { redirect } from "next/navigation";

// Itens do pedido são segunda camada e aparecem dentro do detalhe da requisição.
// Esta rota deixou de ser uma lista solta — redireciona para os Pedidos.
// Ver FRONTEND_EXPOSURE_BACKLOG.md / readiness/clinical_laboratory.md.
export default function LabOrderItemsRedirectPage() {
  redirect("/clinical-laboratory/orders");
}
