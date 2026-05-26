/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Pregnancy = {
    readonly id?: number;
    readonly patient_name?: string;
    readonly doctor_name?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    last_menstrual_period_date?: string | null;
    expected_delivery_date?: string | null;
    /**
     * Identificação do berçário/ala/sala (quando aplicável).
     */
    nursery?: string;
    /**
     * Número/identificação da bed (quando aplicável).
     */
    maternity_bed?: string;
    /**
     * Histórico obstétrico: total de partos já realizados.
     */
    total_deliveries?: number;
    /**
     * Histórico obstétrico: total de partos vaginais.
     */
    normal_deliveries?: number;
    /**
     * Histórico obstétrico: total de partos por cesariana.
     */
    cesareans?: number;
    status?: 'ACOMP' | 'PARTO' | 'ENCERR' | 'CANCEL';
    notes?: string;
    readonly created_at?: string;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    patient: number;
    responsible_doctor?: number | null;
};
