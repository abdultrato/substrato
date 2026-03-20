/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ProcedimentoCatalogo = {
    readonly id?: number;
    readonly criado_em?: string;
    readonly atualizado_em?: string;
    readonly id_custom?: string | null;
    deletado?: boolean;
    deletado_em?: string | null;
    versao?: number;
    nome: string;
    descricao?: string;
    preco_padrao?: string;
    /**
     * Taxa de IVA aplicada ao procedimento (0 a 100).
     */
    iva_percentual?: string;
    /**
     * Desmarque se este procedimento normalmente não deve ter IVA.
     */
    aplica_iva_por_padrao?: boolean;
    criado_por?: number | null;
    atualizado_por?: number | null;
    inquilino: number;
    deletado_por?: number | null;
};

