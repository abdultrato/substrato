/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CheckinRecepcaoEstadoEnum } from './CheckinRecepcaoEstadoEnum';
import type { CheckinRecepcaoPrioridadeEnum } from './CheckinRecepcaoPrioridadeEnum';
export type PatchedCheckinRecepcaoRequest = {
    prioridade?: CheckinRecepcaoPrioridadeEnum;
    estado?: CheckinRecepcaoEstadoEnum;
    motivo?: string;
    observacoes?: string;
    chegou_em?: string;
    chamado_em?: string | null;
    concluido_em?: string | null;
    paciente?: number;
    requisicao?: number | null;
    fatura?: number | null;
    atendente?: number | null;
};

