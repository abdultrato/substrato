/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DiaSemanaEnum } from './DiaSemanaEnum';
export type PatchedHorarioTrabalhoRequest = {
    versao?: number;
    dia_semana?: DiaSemanaEnum;
    hora_inicio?: string;
    hora_fim?: string;
    ativo?: boolean;
    funcionario?: number;
};

