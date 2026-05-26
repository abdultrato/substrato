/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type StockReservation = {
    readonly id?: number;
    readonly order_number?: string;
    readonly item_sku?: string;
    readonly lot_number?: string;
    readonly location_code?: string;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    quantity: string;
    status?: 'ACTIVE' | 'RELEASED' | 'CONSUMED' | 'CANCELLED';
    readonly reserved_at?: string;
    readonly released_at?: string | null;
    readonly consumed_at?: string | null;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    sales_order: number;
    sales_order_line: number;
    item: number;
    lot?: number | null;
    location: number;
};
