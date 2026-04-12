import { redirect } from "next/navigation"

export default function ModulesGroupPage({ params }: { params: { group: string } }) {
    const { group } = params
    redirect(`/modulos/${group}`)
}
