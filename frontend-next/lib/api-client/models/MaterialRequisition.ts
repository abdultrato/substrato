/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type MaterialRequisition = {
    readonly id?: number;
    readonly items?: Array<{
        readonly id?: number;
        readonly available_quantity?: string;
        readonly product_name?: string;
        readonly lot_number?: string;
        readonly lot_expiration_date?: string;
        readonly created_at?: string;
        readonly updated_at?: string;
        readonly custom_id?: string | null;
        readonly deleted?: boolean;
        readonly deleted_at?: string | null;
        readonly version?: number;
        position?: number;
        requested_quantity: number;
        readonly supplied_quantity?: number;
        notes?: string | null;
        readonly created_by?: string | null;
        readonly updated_by?: string | null;
        readonly deleted_by?: string | null;
        readonly tenant?: string;
        requisition: number;
        lot: number;
    }>;
    items_input: Array<{
        position?: number;
        lot: number;
        requested_quantity: number;
        notes?: string | null;
    }>;
    readonly created_by_name?: string;
    readonly sector_label?: string;
    readonly status_label?: string;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    sector?: 'LAB' | 'ENF' | 'REC' | 'MED' | 'MOC' | 'OUT';
    /**
     * Departamento do utilizador no momento da requisição.
     */
    readonly requested_by_department?: string;
    readonly status?: 'PEN' | 'PAR' | 'FUL' | 'HLD';
    readonly hold_reason?: string | null;
    readonly fulfilled_at?: string | null;
    readonly on_hold_at?: string | null;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    readonly fulfilled_by?: string | null;
    readonly on_hold_by?: string | null;
};
