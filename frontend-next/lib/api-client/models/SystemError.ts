/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SystemError = {
    readonly id?: number;
    readonly user_name?: string;
    readonly ip?: string | null;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    method: string;
    path: string;
    full_path?: string;
    status_code?: number;
    duration_ms?: number | null;
    user_agent?: string;
    view_basename?: string;
    view_action?: string;
    object_id?: string;
    exception_class?: string;
    message?: string;
    traceback?: string;
    metadata?: Record<string, any>;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    user?: number | null;
};
