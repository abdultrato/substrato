/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type BloodUnit = {
    readonly id?: number;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    unit_number: string;
    component_type?: 'WB' | 'RBC' | 'PLS' | 'PLT' | 'CRY';
    blood_type?: 'O-' | 'O+' | 'A-' | 'A+' | 'B-' | 'B+' | 'AB-' | 'AB+' | 'UNK';
    volume_ml?: number;
    collected_at: string;
    expires_at: string;
    status?: 'QUA' | 'AVL' | 'RES' | 'FWD' | 'TRN' | 'EXP' | 'DSC';
    forwarded_to_sector?: string;
    forwarded_at?: string | null;
    dispatch_outcome?: 'PEN' | 'TRN' | 'RET' | 'DSC';
    dispatch_outcome_at?: string | null;
    dispatch_outcome_notes?: string;
    is_irradiated?: boolean;
    notes?: string;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    donation: number;
    storage?: number | null;
    reserved_for?: number | null;
    forwarded_by?: number | null;
    dispatch_outcome_by?: number | null;
};
