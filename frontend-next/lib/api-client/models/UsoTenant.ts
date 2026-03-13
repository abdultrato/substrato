/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UsoTenant = {
    readonly id?: number;
    readonly criado_em?: string;
    readonly atualizado_em?: string;
    readonly id_custom?: string | null;
    deletado?: boolean;
    deletado_em?: string | null;
    versao?: number;
    usuarios_ativos?: number;
    requisicoes_mes_atual?: number;
    criado_por?: number | null;
    atualizado_por?: number | null;
    deletado_por?: number | null;
    inquilino: number;
};

