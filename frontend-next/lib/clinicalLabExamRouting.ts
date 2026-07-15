export type RoutableLabItem = {
  exam_method?: string | null;
  test_method?: string | null;
  exam_name?: string | null;
  test_name?: string | null;
  medical_exam_name?: string | null;
  exam_custom_id?: string | null;
  test_code?: string | null;
  code?: string | null;
  custom_id?: string | null;
};

const DEFAULT_WORKLIST = "/clinical-laboratory/worklists";

function norm(value?: string | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function tokens(item: RoutableLabItem) {
  return [
    item.exam_method,
    item.test_method,
    item.exam_name,
    item.test_name,
    item.medical_exam_name,
    item.exam_custom_id,
    item.test_code,
    item.code,
    item.custom_id,
  ].map(norm);
}

export function clinicalLabExamRoute(item: RoutableLabItem): string | null {
  const values = tokens(item);
  const haystack = values.join(" ");

  if (values.some((value) => value.includes("cultura"))) {
    return "/clinical-laboratory/cultures";
  }

  if (values.some((value) => value === "baar" || value.includes("baciloscopia") || value.includes("baar"))) {
    return "/clinical-laboratory/afb-smears";
  }

  if (values.some((value) => value.includes("genexpert") || value.includes("genexp") || value.includes("xpert"))) {
    return "/clinical-laboratory/molecular/genexpert";
  }

  if (
    (haystack.includes("hiv") && (haystack.includes("carga viral") || haystack.includes("viral load"))) ||
    haystack.includes("cvhiv") ||
    haystack.includes("cv_hiv")
  ) {
    return "/clinical-laboratory/molecular/hiv-viral-load";
  }

  return null;
}

export function clinicalLabItemsRoute(items: RoutableLabItem[], fallback = DEFAULT_WORKLIST) {
  const routes = Array.from(new Set(items.map(clinicalLabExamRoute).filter(Boolean)));
  return routes.length === 1 ? routes[0]! : fallback;
}

export function isSpecialClinicalLabExam(item: RoutableLabItem) {
  return clinicalLabExamRoute(item) !== null;
}
