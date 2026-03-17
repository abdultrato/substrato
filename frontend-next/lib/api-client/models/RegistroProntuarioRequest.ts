/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RegistroProntuarioEstadoEnum } from './RegistroProntuarioEstadoEnum';
export type RegistroProntuarioRequest = {
    inicio_atendimento?: string;
    fim_atendimento?: string | null;
    estado?: RegistroProntuarioEstadoEnum;
    sintomas?: string;
    diagnostico?: string;
    /**
     * Texto livre opcional. A prescrição estruturada fica nos itens de prescrição.
     */
    prescricao?: string;
    relatorio_medico?: string;
    paciente: number;
    medico?: number | null;
    consultas?: Array<number>;
};

