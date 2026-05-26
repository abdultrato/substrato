/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type MedicalRecordEntry = {
    readonly id?: number;
    readonly patient_name?: string;
    readonly doctor_name?: string;
    readonly consultation_codes?: string;
    readonly prescription_items?: Array<{
        readonly id?: number;
        readonly medication_name?: string;
        readonly created_at?: string;
        readonly updated_at?: string;
        readonly custom_id?: string | null;
        readonly deleted?: boolean;
        readonly deleted_at?: string | null;
        readonly version?: number;
        position?: number;
        /**
         * Quantidade da dose (ex.: 500).
         */
        dosage_value?: string;
        dosage_unit?: 'MG' | 'ML' | 'G' | 'L' | 'KG';
        /**
         * Intervalo entre doses. Obrigatório quando houver mais de uma dose.
         */
        interval_hours?: number | null;
        /**
         * Quantidade total de doses. Para dose única, informe 1.
         */
        dose_count?: number;
        notes?: string;
        readonly created_by?: string | null;
        readonly updated_by?: string | null;
        readonly deleted_by?: string | null;
        readonly tenant?: string;
        record: number;
        medication: number;
    }>;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    care_start_at?: string;
    care_end_at?: string | null;
    status?: 'RASCUNHO' | 'FINALIZADO' | 'CANCELADO';
    symptoms?: string;
    diagnosis?: string;
    /**
     * Texto livre opcional. A prescrição estruturada fica nos itens de prescrição.
     */
    prescription?: string;
    medical_report?: string;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    patient: number;
    doctor?: number | null;
    consultations?: Array<number>;
};
