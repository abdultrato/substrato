/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ReplenishmentPlan = {
    readonly id?: number;
    readonly suggestions?: Array<{
        readonly id?: number;
        readonly item_sku?: string;
        readonly warehouse_label?: string;
        readonly created_at?: string;
        readonly updated_at?: string;
        readonly custom_id?: string | null;
        readonly deleted?: boolean;
        readonly deleted_at?: string | null;
        readonly version?: number;
        readonly current_quantity?: string;
        readonly reserved_quantity?: string;
        readonly available_quantity?: string;
        readonly reorder_point?: string;
        recommended_quantity: string;
        estimated_unit_cost?: string;
        readonly status?: 'OPEN' | 'ORDERED' | 'IGNORED';
        readonly created_by?: string | null;
        readonly updated_by?: string | null;
        readonly deleted_by?: string | null;
        readonly tenant?: string;
        plan: number;
        item: number;
        warehouse?: number | null;
    }>;
    readonly purchase_order_number?: string;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    name: string;
    plan_number: string;
    supplier_name?: string;
    readonly status?: 'DRAFT' | 'GENERATED' | 'ORDERED' | 'CANCELLED';
    readonly generated_at?: string | null;
    notes?: string;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    /**
     * Quando vazio, o plano considera todos os armazéns do tenant.
     */
    warehouse?: number | null;
    readonly purchase_order?: string | null;
};
