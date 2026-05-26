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
    unit?: 'g/dl' | 'mg/dl' | 'mmol/l' | 'µmol/l' | 'cel/mm3' | 'x10³/µl' | 'x10⁶/µL' | '%' | 'u/l' | 'p/µL' | 'ph' | 'fl';
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
