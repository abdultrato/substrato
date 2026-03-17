/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CheckinRecepcaoEstadoEnum } from './CheckinRecepcaoEstadoEnum';
import type { CheckinRecepcaoPrioridadeEnum } from './CheckinRecepcaoPrioridadeEnum';
export type CheckinRecepcao = {
    readonly id?: number;
    readonly paciente_nome?: string;
    readonly paciente_codigo?: string;
    readonly requisicao_codigo?: string;
    readonly fatura_codigo?: string;
    readonly estado_display?: string;
    readonly prioridade_display?: string;
    readonly atendente_nome?: string;
    readonly criado_em?: string;
    readonly atualizado_em?: string;
    readonly id_custom?: string | null;
    readonly deletado?: boolean;
    readonly deletado_em?: string | null;
    readonly versao?: number;
    prioridade?: CheckinRecepcaoPrioridadeEnum;
    estado?: CheckinRecepcaoEstadoEnum;
    motivo?: string;
    observacoes?: string;
    chegou_em?: string;
    chamado_em?: string | null;
    concluido_em?: string | null;
    readonly criado_por?: number | null;
    readonly atualizado_por?: number | null;
    readonly inquilino?: number;
    readonly deletado_por?: number | null;
    paciente: number;
    requisicao?: number | null;
    fatura?: number | null;
    atendente?: number | null;
};

