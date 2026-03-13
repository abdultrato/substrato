/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AutorizacaoProcedimentoStatusEnum } from './AutorizacaoProcedimentoStatusEnum';
export type PatchedAutorizacaoProcedimentoRequest = {
    deletado?: boolean;
    deletado_em?: string | null;
    versao?: number;
    descricao?: string | null;
    ordem?: number;
    requisicao_id?: string;
    status?: AutorizacaoProcedimentoStatusEnum;
    codigo_autorizacao?: string | null;
    data_resposta?: string | null;
    nome?: string | null;
    ativo?: boolean;
    criado_por?: number | null;
    atualizado_por?: number | null;
    inquilino?: number;
    deletado_por?: number | null;
    plano?: number;
};

