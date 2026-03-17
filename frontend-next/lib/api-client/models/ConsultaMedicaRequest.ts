/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ConsultaMedicaEstadoEnum } from './ConsultaMedicaEstadoEnum';
export type ConsultaMedicaRequest = {
    tipo?: string;
    descricao?: string;
    agendada_para?: string;
    estado?: ConsultaMedicaEstadoEnum;
    preco?: string;
    concluida_em?: string | null;
    cancelada_em?: string | null;
    paciente: number;
    medico?: number | null;
    especialidade?: number | null;
};

