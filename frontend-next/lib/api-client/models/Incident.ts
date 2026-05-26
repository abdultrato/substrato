/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Incident = {
    readonly id?: number;
    readonly status?: string;
    readonly equipment_name?: string;
    readonly equipment_serial_number?: string;
    readonly maintenance_status?: string;
    readonly maintenance_count?: string;
    readonly latest_maintenance?: string;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    date?: string;
    type?: 'AVARIA' | 'INCIDENTE' | 'OUTRO';
    description: string;
    support_contact?: string;
    post_incident_actions?: string;
    requires_maintenance?: boolean;
    maintenance_requested_at?: string | null;
    maintenance_completed_at?: string | null;
    resolved?: boolean;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    equipment?: number | null;
};
