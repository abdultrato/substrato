import { redirect } from "next/navigation"

function mapGroup(g: string) {
    if (!g) return g
    if (g === "human-resources") return "recursos_humanos"
    return g.replace(/-/g, "_")
}

function mapRecurso(r: string) {
    if (!r) return r
    // Best-effort: convert hyphens to underscores; more mappings can be added
    return r.replace(/-/g, "_")
}

export default function ResourcesRecursoPage({ params }: { params: { group: string; recurso: string } }) {
    const { group, recurso } = params
    const mappedGroup = mapGroup(group)
    const mappedRecurso = mapRecurso(recurso)
    redirect(`/recursos/${mappedGroup}/${mappedRecurso}`)
}
