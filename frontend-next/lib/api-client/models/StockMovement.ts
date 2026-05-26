/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type StockMovement = {
    readonly id?: number;
    readonly item_sku?: string;
    readonly lot_number?: string;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    name: string;
    movement_type: 'RECEIPT' | 'ISSUE' | 'TRANSFER' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'COUNT_CORRECTION';
    quantity: string;
    unit_cost?: string;
    reference_document?: string;
    reason?: string;
    status?: 'DRAFT' | 'POSTED' | 'CANCELLED';
    readonly posted_at?: string | null;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    item: number;
    lot?: number | null;
    source_location?: number | null;
    destination_location?: number | null;
};
