/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type MedicalConsultation = {
    readonly id?: number;
    type?: string;
    readonly patient_name?: string;
    readonly doctor_name?: string;
    readonly specialty_name?: string;
    readonly specialty_sector?: string;
    readonly specialty_sector_display?: string;
    readonly invoice_id?: string;
    readonly invoice_code?: string;
    readonly invoice_status?: string;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    description?: string;
    scheduled_for?: string;
    status?: 'MARCADA' | 'CONCLUIDA' | 'CANCELADA';
    price?: string;
    /**
     * Fator aplicado sobre o preço base conforme horário/feriado.
     */
    readonly price_multiplier?: string;
    readonly schedule_type?: 'NORMAL' | 'FORA_EXPEDIENTE' | 'FIM_SEMANA' | 'FERIADO_MANUAL';
    /**
     * Marque se a date for feriado mesmo não sendo fim de semana.
     */
    manual_holiday?: boolean;
    completed_at?: string | null;
    canceled_at?: string | null;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    patient: number;
    doctor?: number | null;
    specialty?: number | null;
};
