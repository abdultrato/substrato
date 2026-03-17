/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DispensaTipoEnum } from './DispensaTipoEnum';
export type DispensaRequest = {
    versao?: number;
    data?: string;
    tipo?: DispensaTipoEnum;
    motivo?: string;
    funcionario: number;
};

