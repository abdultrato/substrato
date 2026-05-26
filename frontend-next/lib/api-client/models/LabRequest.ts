/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type LabRequest = {
    readonly id?: number;
    exams?: Array<number>;
    medical_exams?: Array<number>;
    readonly samples?: Array<string>;
    readonly collection_guidance?: string;
    readonly sample_details?: Array<{
        readonly id?: number;
        readonly custom_id?: string | null;
        name: string;
        bottle_type?: 'TUBO_SECO' | 'TUBO_EDTA' | 'TUBO_CITRATO' | 'TUBO_FLUORETO' | 'FRASCO_URINA' | 'FRASCO_FEZES' | 'FRASCO_ESTERIL' | 'HEMOCULTURA' | 'OUTRO';
        /**
         * Ex.: roxa, vermelha, azul, amarela.
         */
        cap_color?: string;
        minimum_volume_ml?: string;
        fasting_required?: boolean;
        fasting_hours?: number;
    }>;
    readonly patient_name?: string;
    readonly patient_code?: string;
    readonly requesting_company_name?: string;
    readonly external_executing_company_name?: string;
    readonly items?: Array<{
        readonly id?: number;
        readonly custom_id?: string | null;
        position?: number;
        exam?: number | null;
        readonly exam_name?: string;
        medical_exam?: number | null;
        readonly medical_exam_name?: string;
        readonly sample_options?: string;
    }>;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    /**
     * Tipo/sector da requisição (LAB ou MED).
     */
    type?: 'LAB' | 'MED';
    status?: 'pendente' | 'em_analise' | 'aguardando_validacao' | 'validado' | 'rejeitado';
    clinical_status?: 'NAO_URGENTE' | 'NORMAL' | 'ROTINA' | 'POUCO_URGENTE' | 'PRIORITARIO' | 'URGENTE' | 'MUITO_URGENTE' | 'URGENTISSIMO' | 'EMERGENCIA';
    readonly has_critical_result?: boolean;
    readonly requires_fasting?: boolean;
    readonly fasting_hours?: number;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    /**
     * Paciente para o qual a análise foi requisitada
     */
    patient: number;
    /**
     * Empresa que subcontrata os serviços (ex.: medicina ocupacional).
     */
    requesting_company?: number | null;
    /**
     * Quando a clínica terceiriza a execução para outra empresa.
     */
    external_executing_company?: number | null;
    analyst?: number | null;
};
