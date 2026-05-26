/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type MaterialRequisitionItem = {
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
};
