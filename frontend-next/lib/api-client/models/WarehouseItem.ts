/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type WarehouseItem = {
    readonly id?: number;
    readonly category_label?: string;
    readonly current_stock?: string;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    name: string;
    sku: string;
    item_type?: 'PRODUCT' | 'MATERIAL' | 'CONSUMABLE' | 'SPARE_PART' | 'SERVICE' | 'ASSET';
    unit_of_measure?: string;
    barcode?: string;
    reorder_point?: string;
    reorder_quantity?: string;
    external_reference?: string;
    status?: 'ACTIVE' | 'INACTIVE';
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    category?: number | null;
    /**
     * Ligação opcional para reutilizar cadastro da farmácia sem duplicar produtos.
     */
    pharmacy_product?: number | null;
};
