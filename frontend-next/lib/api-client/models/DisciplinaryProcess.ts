/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type DisciplinaryProcess = {
    readonly id?: number;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    incident_date?: string;
    incident_type?: string;
    severity?: 'LEVE' | 'MODERADA' | 'GRAVE' | 'GRAVISSIMA';
    /**
     * Incidentes, maus comportamentos e atitudes que prejudicam a empresa ou colaboradores.
     */
    description?: string;
    action_taken?: string;
    status?: 'ABERTO' | 'ENCERRADO';
    resolved_at?: string | null;
    notes?: string;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    employee: number;
};
