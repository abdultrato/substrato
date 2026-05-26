/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type NursingRecord = {
    readonly id?: number;
    readonly patient_name?: string;
    readonly lab_request_code?: string;
    readonly lab_request_status?: string;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    name: string;
    record_kind?: 'MANUAL' | 'LAB_COLLECTION_REQUEST';
    origin_role?: string;
    priority?: 'URG' | 'NOR' | 'BAI';
    observation?: string;
    /**
     * Estrutura operacional da coleta por exame, com opções de amostra, tipo de frasco/tubo e volume mínimo.
     */
    collection_guidance?: Record<string, any>;
    readonly record_date?: string;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    patient: number;
    lab_request?: number | null;
};
