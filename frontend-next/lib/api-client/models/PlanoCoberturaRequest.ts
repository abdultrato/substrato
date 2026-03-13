/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PlanoCoberturaRequest = {
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

