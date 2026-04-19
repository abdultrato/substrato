import { redirect } from "next/navigation"

export default function AccountingPage() {
    // Alias em inglês; rota real vive em /contabilidade.
    redirect("/contabilidade")
}
