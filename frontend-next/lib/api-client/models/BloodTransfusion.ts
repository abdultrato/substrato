/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type BloodTransfusion = {
    readonly id?: number;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    status?: 'REQ' | 'APR' | 'INP' | 'COM' | 'CAN' | 'REA';
    requested_at?: string;
    started_at?: string | null;
    finished_at?: string | null;
    indication?: string;
    reaction_notes?: string;
    notes?: string;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    recipient: number;
    blood_unit: number;
    requested_by?: number | null;
    performed_by?: number | null;
};
