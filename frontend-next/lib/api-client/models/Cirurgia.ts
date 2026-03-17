/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CirurgiaEstadoEnum } from './CirurgiaEstadoEnum';
export type Cirurgia = {
    readonly id?: number;
    readonly paciente_nome?: string;
    readonly cirurgiao_nome?: string;
    readonly procedimentos_nomes?: Array<string>;
    readonly criado_em?: string;
    readonly atualizado_em?: string;
    readonly id_custom?: string | null;
    readonly deletado?: boolean;
    readonly deletado_em?: string | null;
    readonly versao?: number;
    /**
     * Use apenas quando o procedimento não estiver no catálogo.
     */
    procedimento?: string;
    descricao?: string;
    agendada_para?: string;
    estado?: CirurgiaEstadoEnum;
    concluida_em?: string | null;
    cancelada_em?: string | null;
    readonly criado_por?: number | null;
    readonly atualizado_por?: number | null;
    readonly inquilino?: number;
    readonly deletado_por?: number | null;
    paciente: number;
    cirurgiao?: number | null;
    procedimentos?: Array<number>;
};

