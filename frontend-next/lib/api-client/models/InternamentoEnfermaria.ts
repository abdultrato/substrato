/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type InternamentoEnfermaria = {
    readonly id?: number;
    readonly paciente_nome?: string;
    readonly cama_numero?: string;
    readonly enfermaria_nome?: string;
    readonly criado_em?: string;
    readonly atualizado_em?: string;
    readonly id_custom?: string | null;
    deletado?: boolean;
    deletado_em?: string | null;
    versao?: number;
    /**
     * Tempo estimado de observação em horas (quando aplicável).
     */
    tempo_estimado_observacao_horas?: number | null;
    data_internamento?: string;
    data_prevista_alta?: string | null;
    alta_em?: string | null;
    proxima_medicacao_em?: string | null;
    proxima_medicacao_descricao?: string;
    ativo?: boolean;
    observacoes?: string;
    criado_por?: number | null;
    atualizado_por?: number | null;
    inquilino: number;
    deletado_por?: number | null;
    cama: number;
    paciente: number;
};

