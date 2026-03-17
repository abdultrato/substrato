/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CirurgiaEstadoEnum } from './CirurgiaEstadoEnum';
export type PatchedCirurgiaRequest = {
    /**
     * Use apenas quando o procedimento não estiver no catálogo.
     */
    procedimento?: string;
    descricao?: string;
    agendada_para?: string;
    estado?: CirurgiaEstadoEnum;
    concluida_em?: string | null;
    cancelada_em?: string | null;
    paciente?: number;
    cirurgiao?: number | null;
    procedimentos?: Array<number>;
};

