/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Lot = {
    readonly id?: number;
    readonly saldo?: string;
    readonly product_name?: string;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    name?: string;
    lot_number: string;
    expiration_date: string;
    /**
     * Quantidade inicial do lote.
     */
    initial_quantity: number;
    /**
     * Preço de venda para itens deste lote.
     */
    sale_price?: string;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    product: number;
};
