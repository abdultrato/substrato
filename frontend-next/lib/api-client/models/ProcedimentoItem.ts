/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ProcedimentoItem = {
    readonly id?: number;
    readonly valor_unitario?: string;
    readonly criado_em?: string;
    readonly atualizado_em?: string;
    readonly id_custom?: string | null;
    deletado?: boolean;
    deletado_em?: string | null;
    versao?: number;
    descricao?: string;
    quantidade?: number;
    realizado?: boolean;
    observacao?: string;
    criado_por?: number | null;
    atualizado_por?: number | null;
    inquilino: number;
    deletado_por?: number | null;
    procedimento: number;
    catalogo?: number | null;
};

