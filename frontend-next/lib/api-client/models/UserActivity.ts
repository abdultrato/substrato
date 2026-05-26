/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UserActivity = {
    readonly id?: number;
    readonly created_at?: string;
    user?: number | null;
    readonly user_name?: string;
    method: string;
    path: string;
    full_path?: string;
    status_code?: number | null;
    duration_ms?: number | null;
    readonly ip?: string | null;
    user_agent?: string;
    view_basename?: string;
    view_action?: string;
    object_id?: string;
    message?: string;
    metadata?: Record<string, any>;
};
