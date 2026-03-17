/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type FolhaPagamento = {
    readonly id?: number;
    readonly criado_em?: string;
    readonly atualizado_em?: string;
    readonly id_custom?: string | null;
    readonly deletado?: boolean;
    readonly deletado_em?: string | null;
    versao?: number;
    ano: number;
    mes: number;
    salario_nominal?: string;
    horas_base_mes?: number;
    multiplicador_hora_extra?: string;
    readonly horas_extras_apuradas?: string;
    readonly valor_hora?: string;
    readonly valor_horas_extras?: string;
    readonly salario_total?: string;
    fechado?: boolean;
    readonly criado_por?: number | null;
    readonly atualizado_por?: number | null;
    readonly inquilino?: number;
    readonly deletado_por?: number | null;
    funcionario: number;
};

