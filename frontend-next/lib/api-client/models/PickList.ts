/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PickList = {
    readonly id?: number;
    readonly lines?: Array<{
        readonly id?: number;
        readonly item_sku?: string;
        readonly lot_number?: string;
        readonly location_code?: string;
        readonly created_at?: string;
        readonly updated_at?: string;
        readonly custom_id?: string | null;
        readonly deleted?: boolean;
        readonly deleted_at?: string | null;
        readonly version?: number;
        quantity_to_pick: string;
        quantity_picked?: string;
        readonly created_by?: string | null;
        readonly updated_by?: string | null;
        readonly deleted_by?: string | null;
        readonly tenant?: string;
        pick_list: number;
        sales_order_line: number;
        reservation: number;
        item: number;
        lot?: number | null;
        source_location: number;
    }>;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    name: string;
    pick_number: string;
    readonly status?: 'DRAFT' | 'OPEN' | 'PICKED' | 'CANCELLED';
    readonly started_at?: string | null;
    readonly completed_at?: string | null;
    notes?: string;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    sales_order: number;
};
