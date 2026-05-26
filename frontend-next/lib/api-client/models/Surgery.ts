/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Surgery = {
    readonly id?: number;
    readonly patient_name?: string;
    readonly surgeon_name?: string;
    readonly procedure_names?: string;
    readonly invoice_id?: string;
    readonly invoice_code?: string;
    readonly invoice_status?: string;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    /**
     * Use quando o procedure não estiver no catálogo.
     */
    procedure?: string;
    description?: string;
    estimated_price?: string;
    vat_percentage?: string;
    applies_vat_by_default?: boolean;
    scheduled_for?: string;
    status?: 'AGENDADA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';
    surgery_size?: 'PEQUENA' | 'GRANDE';
    completed_at?: string | null;
    canceled_at?: string | null;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    patient: number;
    surgeon?: number | null;
    procedures?: Array<number>;
};
