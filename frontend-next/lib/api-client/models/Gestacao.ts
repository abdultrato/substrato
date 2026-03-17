/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { GestacaoEstadoEnum } from './GestacaoEstadoEnum';
export type Gestacao = {
    readonly id?: number;
    readonly paciente_nome?: string;
    readonly medico_nome?: string;
    readonly atualizado_em?: string;
    readonly id_custom?: string | null;
    readonly deletado?: boolean;
    readonly deletado_em?: string | null;
    readonly versao?: number;
    data_ultima_menstruacao?: string | null;
    data_prevista_parto?: string | null;
    /**
     * Identificação do berçário/ala/sala (quando aplicável).
     */
    bercario?: string;
    /**
     * Número/identificação da cama (quando aplicável).
     */
    cama_maternidade?: string;
    /**
     * Histórico obstétrico: total de partos já realizados.
     */
    partos_totais?: number;
    /**
     * Histórico obstétrico: total de partos vaginais.
     */
    partos_normais?: number;
    /**
     * Histórico obstétrico: total de partos por cesariana.
     */
    cesarianas?: number;
    estado?: GestacaoEstadoEnum;
    observacoes?: string;
    readonly criado_em?: string;
    readonly criado_por?: number | null;
    readonly atualizado_por?: number | null;
    readonly inquilino?: number;
    readonly deletado_por?: number | null;
    paciente: number;
    medico_responsavel?: number | null;
};

