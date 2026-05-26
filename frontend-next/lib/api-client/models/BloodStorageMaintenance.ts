/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type BloodStorageMaintenance = {
    readonly id?: number;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    maintenance_type?: 'PRV' | 'COR' | 'CAL' | 'SAN' | 'TMP';
    status?: 'SCH' | 'INP' | 'COM' | 'CAN';
    scheduled_at?: string;
    performed_at?: string | null;
    next_due_at?: string | null;
    technician_name?: string;
    findings?: string;
    actions_taken?: string;
    notes?: string;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    storage: number;
};
