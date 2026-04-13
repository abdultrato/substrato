import { redirect } from "next/navigation"

export default async function ModulesGroupPage({
    params,
}: {
    params: Promise<{ group: string }>
}) {
    const { group } = await params
    redirect(`/modulos/${group}`)
}
