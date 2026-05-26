/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PurchaseOrder = {
    readonly id?: number;
    readonly lines?: Array<{
        readonly id?: number;
        readonly item_sku?: string;
        readonly pending_quantity?: string;
        readonly created_at?: string;
        readonly updated_at?: string;
        readonly custom_id?: string | null;
        readonly deleted?: boolean;
        readonly deleted_at?: string | null;
        readonly version?: number;
        ordered_quantity: string;
        readonly received_quantity?: string;
        unit_cost?: string;
        readonly created_by?: string | null;
        readonly updated_by?: string | null;
        readonly deleted_by?: string | null;
        readonly tenant?: string;
        purchase_order: number;
        item: number;
    }>;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    name: string;
    order_number: string;
    supplier_name: string;
    supplier_document?: string;
    ordered_at?: string;
    expected_at?: string | null;
    status?: 'DRAFT' | 'POSTED' | 'CANCELLED';
    notes?: string;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
};
