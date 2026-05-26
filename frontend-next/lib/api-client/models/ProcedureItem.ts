/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ProcedureItem = {
    readonly id?: number;
    readonly value_unitario?: string;
    readonly catalog_name?: string;
    readonly catalog_code?: string;
    readonly execution_status_display?: string;
    readonly patient_name?: string;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    position?: number;
    description?: string;
    quantity?: number;
    performed?: boolean;
    execution_status?: 'PEN' | 'EXE' | 'CON' | 'NCO';
    billed?: boolean;
    billed_at?: string | null;
    executed_at?: string | null;
    completed_at?: string | null;
    observation?: string;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    procedure: number;
    catalog?: number | null;
};
