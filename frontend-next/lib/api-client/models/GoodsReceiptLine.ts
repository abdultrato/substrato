/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type GoodsReceiptLine = {
    readonly id?: number;
    readonly item_sku?: string;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    lot_number?: string;
    expiration_date?: string | null;
    quantity: string;
    unit_cost?: string;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    receipt: number;
    purchase_order_line?: number | null;
    item: number;
    lot?: number | null;
    location?: number | null;
};
