/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DosagemUnidadeEnum } from './DosagemUnidadeEnum';
export type PrescricaoItem = {
    readonly id?: number;
    readonly medicacao_nome?: string;
    readonly criado_em?: string;
    readonly atualizado_em?: string;
    readonly id_custom?: string | null;
    readonly deletado?: boolean;
    readonly deletado_em?: string | null;
    readonly versao?: number;
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
    readonly criado_por?: number | null;
    readonly atualizado_por?: number | null;
    readonly inquilino?: number;
    readonly deletado_por?: number | null;
    registro: number;
    medicacao: number;
};

