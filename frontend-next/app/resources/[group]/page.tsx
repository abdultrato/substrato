import { redirect } from "next/navigation"

function mapGroup(g: string) {
    if (!g) return g
    // Known mapping for human-resources
    if (g === "human-resources") return "recursos_humanos"
    // Fallback: replace hyphens with underscores to match module keys
    return g.replace(/-/g, "_")
}

export default async function ResourcesGroupPage({
    params,
}: {
    params: Promise<{ group: string }>
}) {
    const { group } = await params
    const mapped = mapGroup(group)
    redirect(`/recursos/${mapped}`)
}
