"use client"

import type { ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, BriefcaseBusiness, Loader2, ShieldCheck, UserRound } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import SearchableSelect, { type SearchableOption } from "@/components/ui/SearchableSelect"
import { SearchableRelationSelect } from "@/components/form/AutoForm"
import { useAuth } from "@/hooks/useAuth"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, apiFetchList } from "@/lib/api"
import {
  canCreateUserWithGroupsByHierarchy,
  canManageUserByHierarchy,
  GROUPS,
  groupAbbreviation,
} from "@/lib/rbac"
import {
  groupWorkspaceHint,
  inferEmployeeAccessGroups,
  matchesCanonicalGroupLabel,
} from "@/lib/identity/userAccessProfiles"
import {
  relationOptionFromRow,
  type RelationOption,
  type RelationTarget,
} from "@/lib/resources/relationOptions"

type IdentityUser = {
  id: number
  username?: string
  name?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string | null
  is_active?: boolean
  is_staff?: boolean
  groups?: number[]
  group_names?: string[] | string | null
}

type ProfessionalProfile = {
  id: number
  user?: number
  employee?: number | null
  role?: string
  department?: string
  professional_registration?: string
  active?: boolean
}

type EmployeeRecord = {
  id: number
  name?: string
  email?: string
  phone?: string
  role_name?: string | null
  profession_name?: string | null
  custom_id?: string | null
}

type UserProvisioningFormProps = {
  userId?: string
}

const EMPLOYEE_TARGET: RelationTarget = {
  endpoint: "/human_resources/employee/",
  labelFields: ["name", "employee_code", "custom_id"],
}

function parseGroupOptions(metadata: any, method: "POST" | "PATCH"): SearchableOption[] {
  const actions = metadata && typeof metadata === "object" ? metadata.actions : null
  if (!actions || typeof actions !== "object") return []
  const spec = actions[method] || actions[method.toLowerCase()]
  const groupField = spec?.groups
  const choices = Array.isArray(groupField?.choices) ? groupField.choices : []

  return choices
    .map((choice: any) => {
      const value = choice?.value
      const label = choice?.display_name ?? choice?.label ?? choice?.value
      if (value === undefined || value === null || !label) return null
      return {
        value: String(value),
        label: String(label),
        hint: groupAbbreviation(String(label)),
      }
    })
    .filter(Boolean) as SearchableOption[]
}

function normalizeGroupNames(value: IdentityUser["group_names"]): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (typeof value === "string" && value.trim()) return [value.trim()]
  return []
}

function inferMatchingGroupOptions(
  options: SearchableOption[],
  canonicalGroups: string[],
): SearchableOption[] {
  if (!canonicalGroups.length) return []
  return options.filter((option) =>
    canonicalGroups.some((group) => matchesCanonicalGroupLabel(option.label, group)),
  )
}

function splitName(fullName: string): { first_name: string; last_name: string } {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return { first_name: "", last_name: "" }
  if (parts.length === 1) return { first_name: parts[0], last_name: "" }
  return {
    first_name: parts.slice(0, -1).join(" "),
    last_name: parts.slice(-1).join(" "),
  }
}

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  hint?: string | null
  children: ReactNode
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-[11px] font-medium text-red-600 dark:text-red-400">{error}</p> : null}
    </label>
  )
}

const inputCls =
  "min-h-11 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] shadow-sm transition-colors duration-150 placeholder:text-[var(--gray-400)] hover:border-[var(--primary-400)] focus:border-[var(--primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"

export default function UserProvisioningForm({ userId }: UserProvisioningFormProps) {
  useAuthGuard()
  const router = useRouter()
  const { user } = useAuth()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const isEditing = !!userId

  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [groupOptions, setGroupOptions] = useState<SearchableOption[]>([])
  const [groupsMetadataError, setGroupsMetadataError] = useState<string | null>(null)
  const [employee, setEmployee] = useState<number | null>(null)
  const [employeeOption, setEmployeeOption] = useState<RelationOption | null>(null)
  const [employeeSnapshot, setEmployeeSnapshot] = useState<EmployeeRecord | null>(null)
  const [profileId, setProfileId] = useState<number | null>(null)
  const [profileRegistration, setProfileRegistration] = useState("")
  const [selectedGroups, setSelectedGroups] = useState<number[]>([])
  const [groupPickerValue, setGroupPickerValue] = useState("")
  const [password, setPassword] = useState("")
  const [values, setValues] = useState({
    username: "",
    name: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    is_active: true,
    is_staff: false,
  })

  const inferredCanonicalGroups = useMemo(
    () => inferEmployeeAccessGroups(employeeSnapshot || {}),
    [employeeSnapshot],
  )
  const inferredGroupOptions = useMemo(
    () => inferMatchingGroupOptions(groupOptions, inferredCanonicalGroups),
    [groupOptions, inferredCanonicalGroups],
  )
  const selectedGroupLabels = useMemo(
    () =>
      selectedGroups
        .map((groupId) => groupOptions.find((option) => option.value === String(groupId))?.label)
        .filter(Boolean) as string[],
    [groupOptions, selectedGroups],
  )
  const primaryWorkspaceHint = useMemo(
    () => groupWorkspaceHint(selectedGroupLabels[0]),
    [selectedGroupLabels],
  )

  useEffect(() => {
    let active = true

    async function loadGroupOptions() {
      setGroupsMetadataError(null)
      try {
        const metadata = await apiFetch<any>("/identity/user/", {
          method: "OPTIONS",
          clientCache: false,
        })
        const options = parseGroupOptions(metadata, isEditing ? "PATCH" : "POST")
        if (!active) return
        if (!options.length) {
          setGroupsMetadataError(
            "O backend não expôs a lista de grupos do utilizador. Sem isso não é possível atribuir o acesso correctamente.",
          )
        }
        setGroupOptions(options)
      } catch (fetchError: any) {
        if (!active) return
        setGroupsMetadataError(
          fetchError?.message ||
            "Falha ao carregar os grupos disponíveis para este utilizador.",
        )
      }
    }

    loadGroupOptions().catch(() => {})
    return () => {
      active = false
    }
  }, [isEditing])

  useEffect(() => {
    if (!employee) {
      setEmployeeSnapshot(null)
      return
    }

    let active = true

    async function loadEmployee() {
      try {
        const data = await apiFetch<EmployeeRecord>(`/human_resources/employee/${employee}/`, {
          clientCache: safeRefreshToken === 0,
        })
        if (!active) return
        setEmployeeSnapshot(data)
        setEmployeeOption(
          relationOptionFromRow(data as Record<string, any>, EMPLOYEE_TARGET) || null,
        )
        setValues((current) => {
          const next = { ...current }
          if (!next.name.trim() && data.name) next.name = data.name
          if (!next.email.trim() && data.email) next.email = data.email
          if (!next.phone.trim() && data.phone) next.phone = data.phone
          if (!next.first_name.trim() && !next.last_name.trim() && data.name) {
            const split = splitName(data.name)
            next.first_name = split.first_name
            next.last_name = split.last_name
          }
          return next
        })
      } catch {
        if (active) setEmployeeSnapshot(null)
      }
    }

    loadEmployee().catch(() => {})
    return () => {
      active = false
    }
  }, [employee, safeRefreshToken])

  useEffect(() => {
    if (!inferredGroupOptions.length) return
    setSelectedGroups((current) => {
      const currentSet = new Set(current.map(String))
      const compatibleAlreadySelected = inferredGroupOptions.some((option) =>
        currentSet.has(option.value),
      )
      if (compatibleAlreadySelected) return current
      return [Number(inferredGroupOptions[0].value), ...current].filter(
        (value, index, arr) => arr.findIndex((item) => item === value) === index,
      )
    })
  }, [inferredGroupOptions])

  useEffect(() => {
    if (!isEditing || !userId) return
    let active = true

    async function loadInitialData() {
      setLoading(true)
      setError(null)
      try {
        const [userData, profileRes] = await Promise.all([
          apiFetch<IdentityUser>(`/identity/user/${userId}/`, { clientCache: false }),
          apiFetchList<ProfessionalProfile>("/identity/perfilprofissional/", {
            page: 1,
            pageSize: 200,
            query: { user: userId },
            clientCache: false,
          }),
        ])

        if (!active) return

        if (!canManageUserByHierarchy(user, { id: userData.id, groups: normalizeGroupNames(userData.group_names) })) {
          setError("Sem autoridade hierárquica para editar este utilizador.")
          return
        }

        setValues({
          username: userData.username || "",
          name: userData.name || "",
          first_name: userData.first_name || "",
          last_name: userData.last_name || "",
          email: userData.email || "",
          phone: userData.phone || "",
          is_active: userData.is_active !== false,
          is_staff: !!userData.is_staff,
        })
        setSelectedGroups(
          Array.isArray(userData.groups) ? userData.groups.map(Number).filter(Number.isFinite) : [],
        )

        const profile =
          profileRes.items.find((item) => Number(item.user) === Number(userId)) || null
        if (profile) {
          setProfileId(profile.id)
          setProfileRegistration(profile.professional_registration || "")
          if (profile.employee) setEmployee(Number(profile.employee))
        }
      } catch (loadError: any) {
        if (!active) return
        setError(loadError?.message || "Falha ao carregar os dados do utilizador.")
      } finally {
        if (active) setLoading(false)
      }
    }

    loadInitialData().catch(() => {})
    return () => {
      active = false
    }
  }, [isEditing, safeRefreshToken, user, userId])

  function setValue<K extends keyof typeof values>(field: K, value: (typeof values)[K]) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function addSelectedGroup(value: string) {
    if (!value) return
    setSelectedGroups((current) => {
      if (current.some((item) => String(item) === value)) return current
      return [...current, Number(value)]
    })
    setGroupPickerValue("")
  }

  function removeSelectedGroup(groupId: number) {
    setSelectedGroups((current) => current.filter((item) => item !== groupId))
  }

  function validate(): boolean {
    const nextErrors: Record<string, string> = {}

    if (!employee) nextErrors.employee = "Selecione o funcionário do RH."
    if (!values.username.trim()) nextErrors.username = "Informe o nome de utilizador."
    if (!values.name.trim()) nextErrors.name = "Informe o nome completo."
    if (!values.email.trim()) nextErrors.email = "Informe o e-mail."
    if (!isEditing && !password.trim()) nextErrors.password = "Defina a palavra-passe inicial."
    if (!selectedGroups.length) nextErrors.groups = "Indique pelo menos um grupo de acesso."

    if (inferredGroupOptions.length) {
      const selectedSet = new Set(selectedGroups.map(String))
      const hasCompatibleGroup = inferredGroupOptions.some((option) =>
        selectedSet.has(option.value),
      )
      if (!hasCompatibleGroup) {
        nextErrors.groups =
          "O grupo tem de corresponder ao cargo/profissão herdado do funcionário em RH."
      }
    }

    if (groupsMetadataError) {
      nextErrors.groups = groupsMetadataError
    }

    const selectedLabels = selectedGroups
      .map((groupId) => groupOptions.find((option) => option.value === String(groupId))?.label)
      .filter(Boolean) as string[]
    if (selectedLabels.length && !canCreateUserWithGroupsByHierarchy(user, selectedLabels)) {
      nextErrors.groups =
        "Os grupos seleccionados excedem a autoridade hierárquica do utilizador actual."
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function upsertProfessionalProfile(userPk: number) {
    const roleText =
      employeeSnapshot?.role_name ||
      employeeSnapshot?.profession_name ||
      selectedGroupLabels[0] ||
      ""

    const payload = {
      user: userPk,
      employee,
      role: roleText,
      professional_registration: profileRegistration || undefined,
      active: values.is_active,
    }

    if (profileId) {
      await apiFetch(`/identity/perfilprofissional/${profileId}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
      return
    }

    await apiFetch("/identity/perfilprofissional/", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  async function handleSubmit() {
    if (!validate()) return

    setSaving(true)
    setError(null)

    try {
      const payload: Record<string, any> = {
        username: values.username.trim(),
        name: values.name.trim(),
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim() || null,
        is_active: values.is_active,
        is_staff: values.is_staff,
        groups: selectedGroups,
      }

      if (password.trim()) payload.password = password

      const userRecord = isEditing
        ? await apiFetch<IdentityUser>(`/identity/user/${userId}/`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await apiFetch<IdentityUser>("/identity/user/", {
            method: "POST",
            body: JSON.stringify(payload),
          })

      await upsertProfessionalProfile(userRecord.id)
      router.push(`/identity/users/${userRecord.id}`)
    } catch (submitError: any) {
      setError(submitError?.message || "Falha ao guardar o utilizador.")
    } finally {
      setSaving(false)
    }
  }

  const availableGroupOptions = groupOptions.filter(
    (option) => !selectedGroups.some((groupId) => String(groupId) === option.value),
  )

  if (loading) {
    return (
      <AppLayout requiredGroups={[GROUPS.ADMIN]}>
        <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={18} className="animate-spin" />
          A carregar utilizador...
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN]}>
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <PageHeader
          title={isEditing ? "Editar utilizador" : "Novo utilizador"}
          subtitle="O tipo de utilizador é obrigatório e deve ser herdado do funcionário em RH para determinar os acessos do sistema."
          actions={
            <Link
              href={isEditing && userId ? `/identity/users/${userId}` : "/identity/users"}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium text-[var(--gray-700)] shadow-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)] hover:text-[var(--text)]"
            >
              <ArrowLeft size={14} />
              Voltar
            </Link>
          }
        />

        {error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_22rem]">
          <section className="space-y-4 rounded-xl border border-white/20 bg-white/25 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Funcionário em RH" required error={fieldErrors.employee}>
                <SearchableRelationSelect
                  fieldName="employee"
                  value={employee}
                  onChange={(value) => setEmployee(value ? Number(value) : null)}
                  target={EMPLOYEE_TARGET}
                  initialOptions={employeeOption ? [employeeOption] : []}
                  placeholder="Pesquisar funcionário..."
                  safeRefreshToken={safeRefreshToken}
                />
              </Field>

              <Field
                label="Grupo de acesso"
                required
                error={fieldErrors.groups}
                hint={
                  inferredGroupOptions.length
                    ? `Herdado de RH: ${inferredGroupOptions.map((option) => option.label).join(", ")}`
                    : employeeSnapshot
                      ? "Sem correspondência automática. Revise o cargo/profissão e seleccione o grupo correcto."
                      : "Primeiro seleccione o funcionário do RH."
                }
              >
                <div className="space-y-2">
                  {selectedGroups.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedGroups.map((groupId) => {
                        const option = groupOptions.find((item) => item.value === String(groupId))
                        return (
                          <span
                            key={`user-group-${groupId}`}
                            className="inline-flex items-center gap-1 rounded-full border border-[var(--primary-300)] bg-[var(--primary-300)]/20 px-2.5 py-1 text-xs font-medium text-[var(--text)]"
                          >
                            {option?.label || `#${groupId}`}
                            <button
                              type="button"
                              onClick={() => removeSelectedGroup(groupId)}
                              className="text-[var(--gray-500)] transition hover:text-red-600"
                            >
                              ×
                            </button>
                          </span>
                        )
                      })}
                    </div>
                  ) : null}

                  <SearchableSelect
                    value={groupPickerValue}
                    onChange={(value) => addSelectedGroup(value)}
                    options={availableGroupOptions}
                    placeholder="Adicionar grupo..."
                    searchPlaceholder="Pesquisar grupo..."
                    emptyMessage="Nenhum grupo disponível."
                    disabled={!employeeSnapshot || !availableGroupOptions.length}
                    allowClear={false}
                  />
                </div>
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nome de utilizador" required error={fieldErrors.username}>
                <input
                  value={values.username}
                  onChange={(event) => setValue("username", event.target.value)}
                  className={inputCls}
                  placeholder="ex.: joana.mabunda"
                />
              </Field>
              <Field label="Nome completo" required error={fieldErrors.name}>
                <input
                  value={values.name}
                  onChange={(event) => setValue("name", event.target.value)}
                  className={inputCls}
                  placeholder="Nome apresentado no sistema"
                />
              </Field>
              <Field label="Primeiro nome">
                <input
                  value={values.first_name}
                  onChange={(event) => setValue("first_name", event.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Apelido">
                <input
                  value={values.last_name}
                  onChange={(event) => setValue("last_name", event.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="E-mail" required error={fieldErrors.email}>
                <input
                  type="email"
                  value={values.email}
                  onChange={(event) => setValue("email", event.target.value)}
                  className={inputCls}
                  placeholder="nome@dominio.com"
                />
              </Field>
              <Field label="Telefone">
                <input
                  value={values.phone}
                  onChange={(event) => setValue("phone", event.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field
                label={isEditing ? "Nova palavra-passe" : "Palavra-passe inicial"}
                required={!isEditing}
                error={fieldErrors.password}
                hint={isEditing ? "Deixe em branco para manter a palavra-passe actual." : null}
              >
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Registo profissional" hint="Opcional; guardado no perfil profissional.">
                <input
                  value={profileRegistration}
                  onChange={(event) => setProfileRegistration(event.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)]">
                <input
                  type="checkbox"
                  checked={values.is_active}
                  onChange={(event) => setValue("is_active", event.target.checked)}
                />
                Conta activa
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)]">
                <input
                  type="checkbox"
                  checked={values.is_staff}
                  onChange={(event) => setValue("is_staff", event.target.checked)}
                />
                Acesso ao admin Django
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving || !!groupsMetadataError}
                className="inline-flex h-11 items-center gap-2 rounded-md bg-[var(--primary-600)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-700)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                {saving ? "Guardando..." : isEditing ? "Guardar alterações" : "Criar utilizador"}
              </button>
            </div>
          </section>

          <aside className="space-y-4 rounded-xl border border-white/20 bg-white/25 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <UserRound size={15} className="text-[var(--primary-600)]" />
                <h2 className="text-sm font-semibold text-foreground">Herança de RH</h2>
              </div>
              {employeeSnapshot ? (
                <div className="space-y-2 text-sm text-foreground">
                  <p>
                    <strong>Funcionário:</strong> {employeeSnapshot.name || "—"}
                  </p>
                  <p>
                    <strong>Cargo:</strong> {employeeSnapshot.role_name || "—"}
                  </p>
                  <p>
                    <strong>Profissão:</strong> {employeeSnapshot.profession_name || "—"}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  O tipo de utilizador será sugerido depois de escolher um funcionário em RH.
                </p>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2">
                <BriefcaseBusiness size={15} className="text-[var(--primary-600)]" />
                <h2 className="text-sm font-semibold text-foreground">Acesso principal</h2>
              </div>
              {selectedGroupLabels.length ? (
                <div className="space-y-2 text-sm text-foreground">
                  <p>{selectedGroupLabels.join(", ")}</p>
                  {primaryWorkspaceHint ? (
                    <p className="text-muted-foreground">
                      Workspace principal esperado: <strong>{primaryWorkspaceHint}</strong>
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sem grupo seleccionado ainda.
                </p>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2">
                <ShieldCheck size={15} className="text-[var(--primary-600)]" />
                <h2 className="text-sm font-semibold text-foreground">Regras</h2>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>O funcionário de RH é obrigatório.</li>
                <li>Pelo menos um grupo de acesso é obrigatório.</li>
                <li>Quando o cargo/profissão do RH bate com um perfil clínico, esse grupo deve estar incluído.</li>
              </ul>
              {groupsMetadataError ? (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {groupsMetadataError}
                </p>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  )
}
