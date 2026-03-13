/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CheckinRecepcaoEstadoEnum } from './CheckinRecepcaoEstadoEnum';
import type { CheckinRecepcaoPrioridadeEnum } from './CheckinRecepcaoPrioridadeEnum';
export type CheckinRecepcao = {
    readonly id?: number;
    readonly id_custom?: string | null;
    readonly inquilino?: number;
    paciente: number;
    readonly paciente_nome?: string;
    readonly paciente_codigo?: string;
    requisicao?: number | null;
    readonly requisicao_codigo?: string;
    fatura?: number | null;
    readonly fatura_codigo?: string;
    atendente?: number | null;
    readonly atendente_nome?: string;
    prioridade?: CheckinRecepcaoPrioridadeEnum;
    readonly prioridade_display?: string;
    estado?: CheckinRecepcaoEstadoEnum;
    readonly estado_display?: string;
    motivo?: string;
    observacoes?: string;
    chegou_em?: string;
    chamado_em?: string | null;
    concluido_em?: string | null;
    readonly criado_em?: string;
    readonly atualizado_em?: string;
    readonly criado_por?: number | null;
    readonly atualizado_por?: number | null;
    readonly deletado?: boolean;
    readonly deletado_em?: string | null;
    readonly deletado_por?: number | null;
};

