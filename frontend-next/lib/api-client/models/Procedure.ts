/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Procedure = {
    readonly id?: number;
    readonly patient_name?: string;
    readonly professional_name?: string;
    readonly professional_names?: string;
    readonly workflow_status_display?: string;
    readonly billing_status_display?: string;
    readonly items_count?: number;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    performed_date?: string;
    notes?: string;
    workflow_status?: 'REQ' | 'BIL' | 'EXE' | 'CON' | 'NCO' | 'PAR';
    billing_status?: 'PEN' | 'PAR' | 'BIL';
    readonly billed_at?: string | null;
    readonly executed_at?: string | null;
    readonly completed_at?: string | null;
    readonly services_subtotal?: string;
    readonly materials_subtotal?: string;
    readonly total?: string;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    patient: number;
    professional?: Array<number>;
    selected_materials?: Array<number>;
    selected_catalogs?: Array<number>;
};
