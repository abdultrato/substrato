/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { GestacaoEstadoEnum } from './GestacaoEstadoEnum';
export type PatchedGestacaoRequest = {
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
    paciente?: number;
    medico_responsavel?: number | null;
};

