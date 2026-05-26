/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type InventoryMovement = {
    readonly id?: number;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    name?: string;
    type: 'ENT' | 'SAI' | 'AJU';
    origin?: 'VEND' | 'PROC' | 'AJUS' | 'REQ';
    quantity: number;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    lot: number;
    sale_item?: number | null;
    material_request_item?: number | null;
};
