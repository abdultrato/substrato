/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type IntegrationMessage = {
    readonly id?: number;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    direction?: 'IN' | 'OUT';
    protocol?: string;
    message_id?: string;
    content_type?: string;
    sha256?: string;
    payload_json?: Record<string, any>;
    payload_raw?: string;
    status?: 'RECV' | 'PROC' | 'ERRO';
    error?: string;
    processed_at?: string | null;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    equipment: number;
    order?: number | null;
};
