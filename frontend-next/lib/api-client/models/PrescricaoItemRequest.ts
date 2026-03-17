/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DosagemUnidadeEnum } from './DosagemUnidadeEnum';
export type PrescricaoItemRequest = {
    /**
     * Quantidade da dose (ex.: 500).
     */
    dosagem_valor?: string;
    dosagem_unidade?: DosagemUnidadeEnum;
    /**
     * Intervalo entre doses. Obrigatório quando houver mais de uma dose.
     */
    intervalo_horas?: number | null;
    /**
     * Quantidade total de doses. Para dose única, informe 1.
     */
    numero_doses?: number;
    observacoes?: string;
    registro: number;
    medicacao: number;
};

