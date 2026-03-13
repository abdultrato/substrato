/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ContaTipoEnum } from './ContaTipoEnum';
export type Conta = {
    readonly id?: number;
    readonly criado_em?: string;
    readonly atualizado_em?: string;
    readonly id_custom?: string | null;
    readonly deletado?: boolean;
    readonly deletado_em?: string | null;
    versao?: number;
    nome: string;
    tipo?: ContaTipoEnum;
    readonly criado_por?: number | null;
    readonly atualizado_por?: number | null;
    readonly inquilino?: number;
    deletado_por?: number | null;
};

