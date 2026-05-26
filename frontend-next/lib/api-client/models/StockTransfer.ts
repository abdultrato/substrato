/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type StockTransfer = {
    readonly id?: number;
    readonly lines?: Array<{
        readonly id?: number;
        readonly item_sku?: string;
        readonly created_at?: string;
        readonly updated_at?: string;
        readonly custom_id?: string | null;
        readonly deleted?: boolean;
        readonly deleted_at?: string | null;
        readonly version?: number;
        quantity: string;
        readonly created_by?: string | null;
        readonly updated_by?: string | null;
        readonly deleted_by?: string | null;
        readonly tenant?: string;
        transfer: number;
        item: number;
        lot?: number | null;
    }>;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    name: string;
    transfer_number: string;
    readonly status?: 'DRAFT' | 'POSTED' | 'CANCELLED';
    readonly posted_at?: string | null;
    notes?: string;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    source_location: number;
    destination_location: number;
};
