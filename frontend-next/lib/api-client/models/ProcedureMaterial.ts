/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ProcedureMaterial = {
    readonly id?: number;
    readonly value_unitario?: string;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    position?: number;
    quantity: number;
    observation?: string;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    procedure: number;
    procedure_item?: number | null;
    product: number;
    lot?: number | null;
    inventory_movement?: number | null;
};
