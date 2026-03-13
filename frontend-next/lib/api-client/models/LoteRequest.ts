/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type LoteRequest = {
    deletado?: boolean;
    deletado_em?: string | null;
    versao?: number;
    nome: string;
    numero_lote: string;
    validade: string;
    /**
     * Quantidade inicial do lote.
     */
    quantidade_inicial: number;
    criado_por?: number | null;
    atualizado_por?: number | null;
    inquilino: number;
    deletado_por?: number | null;
    produto: number;
};

