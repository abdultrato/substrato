/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Movimento = {
    readonly id?: number;
    readonly criado_em?: string;
    readonly atualizado_em?: string;
    readonly id_custom?: string | null;
    readonly deletado?: boolean;
    readonly deletado_em?: string | null;
    versao?: number;
    nome: string;
    debito?: string;
    credito?: string;
    readonly criado_por?: number | null;
    readonly atualizado_por?: number | null;
    readonly inquilino?: number;
    deletado_por?: number | null;
    lancamento: number;
    conta: number;
};

