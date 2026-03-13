/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PlanoCobertura = {
    readonly id?: number;
    readonly criado_em?: string;
    readonly atualizado_em?: string;
    readonly id_custom?: string | null;
    deletado?: boolean;
    deletado_em?: string | null;
    versao?: number;
    descricao?: string | null;
    nome: string;
    ordem?: number;
    /**
     * Percentual de cobertura (0-100).
     */
    percentual_cobertura?: string;
    exige_autorizacao?: boolean;
    ativo?: boolean;
    criado_por?: number | null;
    atualizado_por?: number | null;
    inquilino: number;
    deletado_por?: number | null;
    seguradora: number;
};

