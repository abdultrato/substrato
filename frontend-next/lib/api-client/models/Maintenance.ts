/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Maintenance = {
    readonly id?: number;
    readonly status?: string;
    readonly maintenance_type_display?: string;
    readonly equipment_name?: string;
    readonly incident_code?: string;
    readonly incident_context?: string;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    type?: 'DIARIA' | 'SEMANAL' | 'MENSAL' | 'SEMESTRAL' | 'ANUAL';
    /**
     * Indica se a manutenção é preventiva ou correctiva.
     */
    maintenance_type: 'PREVENTIVA' | 'CORRECTIVA';
    scheduled_date?: string;
    performed_date?: string | null;
    description?: string;
    technician?: string;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    /**
     * Ocorrência que deu origem a esta manutenção.
     */
    incident?: number | null;
    equipment?: number;
};
