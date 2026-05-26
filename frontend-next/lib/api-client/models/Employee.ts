/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Employee = {
    readonly id?: number;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    name: string;
    nuit?: string;
    nib?: string;
    document_number?: string;
    email?: string;
    phone?: string;
    admission_date?: string;
    status?: 'ATIVO' | 'INATIVO';
    nominal_salary?: string;
    /**
     * Valor adicional por promoção/aumento (somado ao salário nominal).
     */
    salary_increase?: string;
    /**
     * Horas contratuais base por mês (ex.: 176).
     */
    base_month_hours?: number;
    ordinary_hour_value?: string;
    extraordinary_hour_value?: string;
    minimum_progression_months?: number;
    minimum_career_change_months?: number;
    family_allowance_per_dependent?: string;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    role?: number | null;
    profession?: number | null;
};
