/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type WarehouseLot = {
    readonly id?: number;
    readonly item_sku?: string;
    readonly expired?: boolean;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    lot_number: string;
    expiration_date?: string | null;
    received_at?: string | null;
    unit_cost?: string;
    status?: 'AVAILABLE' | 'QUARANTINE' | 'BLOCKED' | 'EXPIRED';
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    item: number;
};
