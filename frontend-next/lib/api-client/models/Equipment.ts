/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Equipment = {
    readonly id?: number;
    readonly status?: string;
    readonly current_status?: string;
    readonly current_status_label?: string;
    readonly last_inspection?: string;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    name: string;
    serial_number: string;
    acquisition_date?: string | null;
    acquisition_status?: 'NOVO' | 'USADO';
    initial_operational_status?: 'FUNCIONANDO' | 'AVARIADO' | 'DESLIGADO';
    initial_failure_type?: string;
    manufacturer?: string;
    model?: string;
    location?: string;
    responsible?: string;
    active?: boolean;
    readonly requires_maintenance?: boolean;
    readonly maintenance_required_since?: string | null;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
};
