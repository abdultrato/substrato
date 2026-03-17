/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PrescricaoItem } from './PrescricaoItem';
import type { RegistroProntuarioEstadoEnum } from './RegistroProntuarioEstadoEnum';
export type RegistroProntuario = {
    readonly id?: number;
    readonly paciente_nome?: string;
    readonly medico_nome?: string;
    readonly consultas_codigos?: Array<string>;
    readonly itens_prescricao?: Array<PrescricaoItem>;
    readonly criado_em?: string;
    readonly atualizado_em?: string;
    readonly id_custom?: string | null;
    readonly deletado?: boolean;
    readonly deletado_em?: string | null;
    readonly versao?: number;
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
    readonly criado_por?: number | null;
    readonly atualizado_por?: number | null;
    readonly inquilino?: number;
    readonly deletado_por?: number | null;
    paciente: number;
    medico?: number | null;
    consultas?: Array<number>;
};

