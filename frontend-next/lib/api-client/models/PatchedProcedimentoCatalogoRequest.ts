/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PatchedProcedimentoCatalogoRequest = {
    deletado?: boolean;
    deletado_em?: string | null;
    versao?: number;
    nome?: string;
    descricao?: string;
    preco_padrao?: string;
    /**
     * Taxa de IVA aplicada ao procedimento (0 a 100).
     */
    iva_percentual?: string;
    criado_por?: number | null;
    atualizado_por?: number | null;
    inquilino?: number;
    deletado_por?: number | null;
};

