/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type StorageLocation = {
    readonly id?: number;
    readonly warehouse_label?: string;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    name: string;
    code: string;
    location_type?: 'DOCK' | 'ZONE' | 'AISLE' | 'RACK' | 'SHELF' | 'BIN' | 'QUARANTINE' | 'DISPATCH';
    barcode?: string;
    status?: 'ACTIVE' | 'INACTIVE';
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    warehouse: number;
    parent?: number | null;
};
