/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type DailyInspection = {
    readonly id?: number;
    readonly description?: string;
    readonly status?: string;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    date?: string;
    operation_status?: 'FUNCIONANDO' | 'AVARIADO' | 'DESLIGADO';
    cleaning_performed?: boolean;
    assessment?: string;
    notes?: string;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    equipment: number;
};
