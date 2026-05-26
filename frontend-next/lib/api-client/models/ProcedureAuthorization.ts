/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ProcedureAuthorization = {
    readonly id?: number;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    description?: string | null;
    order?: number;
    request_id: string;
    status?: 'PENDENTE' | 'APROVADA' | 'NEGADA';
    authorization_code?: string | null;
    response_date?: string | null;
    name?: string | null;
    active?: boolean;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    plan: number;
};
