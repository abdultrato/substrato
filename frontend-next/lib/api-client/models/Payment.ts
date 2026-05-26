/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Payment = {
    readonly id?: number;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    name: string;
    value: string;
    change_amount?: string;
    method: 'DIN' | 'CAR' | 'TRF' | 'MOB' | 'POS' | 'CHQ' | 'SEG' | 'OUT';
    status?: 'PEN' | 'CON' | 'FAL' | 'EST' | 'CAN';
    /**
     * Referência externa (transação, autorização, etc).
     */
    external_reference?: string;
    /**
     * Número de autorização do seguro de saúde.
     */
    authorization_number?: string;
    /**
     * Dados adicionais do seguro de saúde (ex.: apólice, beneficiário).
     */
    insurance_date?: Record<string, any>;
    paid_at?: string | null;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    invoice: number;
    insurer?: number | null;
    coverage_plan?: number | null;
};
