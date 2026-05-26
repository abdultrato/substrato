/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type IntegrationCredential = {
    readonly id?: number;
    readonly generated_key?: string;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    label?: string;
    readonly key_prefix?: string;
    readonly key_last4?: string;
    scopes?: Record<string, any>;
    active?: boolean;
    readonly revoked_at?: string | null;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    equipment: number;
};
