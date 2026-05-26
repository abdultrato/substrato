/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ReceptionCheckin = {
    readonly id?: number;
    readonly patient_name?: string;
    readonly patient_code?: string;
    readonly request_code?: string;
    readonly invoice_code?: string;
    readonly status_display?: string;
    readonly priority_display?: string;
    readonly attendant_name?: string;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    priority?: 'URG' | 'PREF' | 'NOR';
    status?: 'AGUARD' | 'ATEND' | 'REQ' | 'FAT' | 'CONC' | 'CANC';
    reason?: string;
    notes?: string;
    arrived_at?: string;
    called_at?: string | null;
    completed_at?: string | null;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    patient: number;
    request?: number | null;
    invoice?: number | null;
    attendant?: number | null;
};
