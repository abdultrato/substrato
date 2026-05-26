/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SalesOrderLine = {
    readonly id?: number;
    readonly item_sku?: string;
    readonly lot_number?: string;
    readonly pending_reservation_quantity?: string;
    readonly pending_shipment_quantity?: string;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    ordered_quantity: string;
    readonly reserved_quantity?: string;
    readonly shipped_quantity?: string;
    unit_price?: string;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    sales_order: number;
    item: number;
    lot?: number | null;
    preferred_location?: number | null;
};
