/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Product = {
    readonly id?: number;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    name: string;
    type?: 'MED' | 'MAT' | 'OUT';
    sale_price?: string;
    /**
     * Taxa de IVA aplicada ao produto (0 a 100).
     */
    vat_percentage?: string;
    /**
     * Desmarque se este produto normalmente não deve ter IVA.
     */
    applies_vat_by_default?: boolean;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    category?: number | null;
};
