export type RouteParam = string | string[] | undefined

export function routeParamToString(value: RouteParam): string {
  if (Array.isArray(value)) return value[0] ?? ""
  return value ?? ""
}

