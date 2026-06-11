/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type LabExamField = {
    readonly id?: number;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    /**
     * Nome do parâmetro/campo do exam
     */
    name: string;
    position?: number;
    type: 'NUMERICO' | 'QUALITATIVO' | 'SEMIQUANTITATIVO' | 'TEXTO';
    /**
     * Unidade de medida do parâmetro (ex: mg/dL, g/L)
     */
    unit?: 'g/dl' | 'g/L' | 'mg/dl' | 'mg/L' | 'mg/24h' | 'µg/dL' | 'µg/L' | 'µg/mL' | 'ng/mL' | 'ng/dL' | 'pg/mL' | 'mmol/l' | 'mmol/mol' | 'µmol/l' | 'nmol/L' | 'pmol/L' | 'mEq/L' | 'cel/mm3' | 'x10³/µl' | 'x10⁶/µL' | '%' | 'u/l' | 'U/mL' | 'UI/L' | 'UI/mL' | 'mUI/L' | 'kU/L' | 'p/µL' | 'ph' | 'fl' | 'mm/h' | 'mmHg' | 'mOsm/kg' | 's' | 'INR' | 'razão/índice' | 'sem unidade';
    reference_min?: string | null;
    reference_max?: string | null;
    critical_min?: string | null;
    critical_max?: string | null;
    max_delta?: string | null;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    exam: number;
};
