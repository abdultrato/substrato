/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Invoice = {
    readonly id?: number;
    readonly created_by_name?: string;
    readonly created_by_department?: string;
    readonly billed_item_sectors?: string;
    readonly total_a_pagar?: string;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    origin?: 'CLI' | 'FAR' | 'ENF' | 'CON' | 'CIR' | 'MIX';
    subtotal?: string;
    vat_amount?: string;
    total?: string;
    insurance_amount?: string;
    patient_amount?: string;
    status?: 'RASC' | 'EMIT' | 'PAGA' | 'CANC';
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    request?: number | null;
    sale?: number | null;
    /**
     * Legado: prefira usar o campo 'procedures' (múltiplos).
     */
    procedure?: number | null;
    consultation?: number | null;
    surgery?: number | null;
    patient?: number | null;
    /**
     * Pode associar múltiplos procedures de enfermagem à mesma invoice.
     */
    procedures?: Array<number>;
    /**
     * Associa várias consultas (ex.: clínica geral e especialidade) a esta fatura.
     */
    consultations?: Array<number>;
};
