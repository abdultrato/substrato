/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PlanoAssinaturaTipoEnum } from './PlanoAssinaturaTipoEnum';
export type PlanoAssinaturaRequest = {
    deletado?: boolean;
    deletado_em?: string | null;
    versao?: number;
    descricao?: string | null;
    nome: string;
    ordem?: number;
    tipo?: PlanoAssinaturaTipoEnum;
    limite_usuarios?: number;
    limite_requisicoes_mes?: number;
    preco_mensal?: string;
    preco_excedente_requisicao?: string;
    suporte_prioritario?: boolean;
    permite_multi_unidade?: boolean;
    ativo?: boolean;
    criado_por?: number | null;
    atualizado_por?: number | null;
    deletado_por?: number | null;
};

