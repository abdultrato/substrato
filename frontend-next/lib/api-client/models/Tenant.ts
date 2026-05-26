/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Tenant = {
    readonly id?: number;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    name: string;
    identifier: string;
    domain?: string | null;
    active?: boolean;
    commercial_status?: 'TRIAL' | 'ATIVO' | 'SUSPENSO';
    trial_until?: string | null;
    blocked_at?: string | null;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
};
