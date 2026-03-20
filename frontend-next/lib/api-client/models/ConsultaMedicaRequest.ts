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
    /**
     * Marque se a data for feriado mesmo não sendo fim de semana.
     */
    feriado_manual?: boolean;
    concluida_em?: string | null;
    cancelada_em?: string | null;
    paciente: number;
    medico?: number | null;
    especialidade?: number | null;
};

