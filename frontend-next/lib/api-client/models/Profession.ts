/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Profession = {
    readonly id?: number;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    name: string;
    description?: string;
    base_salary?: string;
    ordinary_hour_value?: string;
    extraordinary_hour_value?: string;
    minimum_progression_months?: number;
    minimum_career_change_months?: number;
    /**
     * Valor adicional por cada agregado familiar ativo do funcionário.
     */
    family_allowance_per_dependent?: string;
    active?: boolean;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
};
