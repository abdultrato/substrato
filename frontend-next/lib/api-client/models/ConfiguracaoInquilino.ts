/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ConfiguracaoInquilino = {
    readonly id?: number;
    readonly criado_em?: string;
    readonly atualizado_em?: string;
    readonly id_custom?: string | null;
    deletado?: boolean;
    deletado_em?: string | null;
    versao?: number;
    fuso_horario?: string;
    moeda?: string;
    idioma?: string;
    permite_multi_unidade?: boolean;
    limite_usuarios?: number;
    acrescimo_percentual_consulta_feriado?: string;
    criado_por?: number | null;
    atualizado_por?: number | null;
    deletado_por?: number | null;
    inquilino: number;
};

