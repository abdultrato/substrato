/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type StockLevel = {
    readonly id?: number;
    readonly item_sku?: string;
    readonly lot_number?: string;
    readonly location_code?: string;
    readonly reserved_quantity?: string;
    readonly available_quantity?: string;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    readonly quantity?: string;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    item: number;
    lot?: number | null;
    location: number;
};
