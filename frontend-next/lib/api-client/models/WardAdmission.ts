/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type WardAdmission = {
    readonly id?: number;
    readonly patient_name?: string;
    readonly bed_number?: string;
    readonly ward_name?: string;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    /**
     * Tempo estimado de observação em hours (quando aplicável).
     */
    estimated_observation_hours?: number | null;
    admission_date?: string;
    expected_discharge_date?: string | null;
    discharged_at?: string | null;
    next_medication_at?: string | null;
    next_medication_description?: string;
    active?: boolean;
    notes?: string;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    bed: number;
    patient: number;
};
