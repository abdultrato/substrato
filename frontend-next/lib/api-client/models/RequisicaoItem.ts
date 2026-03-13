/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Serializer para itens de uma requisição de análise.
 * Vincula exames específicos a uma requisição.
 */
export type RequisicaoItem = {
    readonly id?: number;
    readonly criado_em?: string;
    readonly atualizado_em?: string;
    readonly id_custom?: string | null;
    deletado?: boolean;
    deletado_em?: string | null;
    versao?: number;
    criado_por?: number | null;
    atualizado_por?: number | null;
    inquilino: number;
    deletado_por?: number | null;
    /**
     * Requisição pai que contém este item
     */
    requisicao: number;
    /**
     * Exame incluído nesta requisição
     */
    exame: number;
};

