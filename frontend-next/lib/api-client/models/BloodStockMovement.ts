/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type BloodStockMovement = {
    readonly id?: number;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    movement_type: 'INB' | 'OUT' | 'TRF' | 'RSV' | 'RLS' | 'FWD' | 'RTN' | 'DSC' | 'EXP' | 'ADJ';
    moved_at?: string;
    reason?: string;
    notes?: string;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    unit: number;
    source_storage?: number | null;
    destination_storage?: number | null;
    performed_by?: number | null;
};
