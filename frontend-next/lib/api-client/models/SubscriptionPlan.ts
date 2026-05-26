/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SubscriptionPlan = {
    readonly id?: number;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    description?: string | null;
    name: string;
    order?: number;
    type?: 'FREE' | 'BASIC' | 'PRO';
    user_limit?: number;
    monthly_request_limit?: number;
    monthly_price?: string;
    request_overage_price?: string;
    priority_support?: boolean;
    allows_multi_unit?: boolean;
    active?: boolean;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
};
