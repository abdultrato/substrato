/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type MedicalExam = {
    readonly id?: number;
    readonly allowed_result_types?: string;
    readonly registered_result_types?: string;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    name: string;
    /**
     * Tempo de response em hours.
     */
    turnaround_hours?: number;
    /**
     * Preço do exam médico.
     */
    price?: string;
    /**
     * Taxa de IVA aplicada ao exam médico (0 a 100).
     */
    vat_percentage?: string;
    /**
     * Desmarque se este exam normalmente não deve ter IVA.
     */
    applies_vat_by_default?: boolean;
    method: 'USG' | 'RX' | 'CT' | 'RM' | 'MG' | 'DXA' | 'ECO' | 'ECG' | 'HOLTER' | 'MAPA' | 'EEG' | 'ENDO' | 'COLONO' | 'ANGIO' | 'MN' | 'OUT';
    sector?: 'Radiologia' | 'DiagnosticoImagem' | 'Cardiologia' | 'GinecoObstetricia' | 'Ortopedia' | 'Neurologia' | 'Otorrino' | 'Oftalmologia' | 'MedicinaNuclear' | 'Endoscopia' | 'Outro' | null;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
};
