/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FeriasEstadoEnum } from './FeriasEstadoEnum';
export type PatchedFeriasRequest = {
    versao?: number;
    data_inicio?: string;
    data_fim?: string;
    estado?: FeriasEstadoEnum;
    observacoes?: string;
    funcionario?: number;
};

