/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ResultItem = {
    readonly id?: number;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    position?: number;
    /**
     * Valor medido do parâmetro
     */
    result_value?: string | null;
    clinical_status?: string;
    report_color?: string | null;
    critical_alert?: boolean;
    status?: 'pendente' | 'em_analise' | 'aguardando_validacao' | 'validado' | 'rejeitado';
    validation_date?: string | null;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    result: number;
    exam_field: number;
    validated_by?: number | null;
    user?: number | null;
};
