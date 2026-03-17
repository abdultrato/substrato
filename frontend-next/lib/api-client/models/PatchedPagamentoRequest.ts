/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MetodoPagamentoEnum } from './MetodoPagamentoEnum';
import type { PagamentoStatusEnum } from './PagamentoStatusEnum';
export type PatchedPagamentoRequest = {
    deletado?: boolean;
    deletado_em?: string | null;
    versao?: number;
    nome?: string;
    valor?: string;
    metodo?: MetodoPagamentoEnum;
    status?: PagamentoStatusEnum;
    /**
     * Referência externa (transação, autorização, etc).
     */
    referencia_externa?: string;
    pago_em?: string | null;
    criado_por?: number | null;
    atualizado_por?: number | null;
    inquilino?: number;
    deletado_por?: number | null;
    fatura?: number;
};

