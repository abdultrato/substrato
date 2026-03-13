/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MovimentoEstoqueOrigemEnum } from './MovimentoEstoqueOrigemEnum';
import type { MovimentoEstoqueTipoEnum } from './MovimentoEstoqueTipoEnum';
export type MovimentoEstoqueRequest = {
    deletado?: boolean;
    deletado_em?: string | null;
    versao?: number;
    nome: string;
    tipo: MovimentoEstoqueTipoEnum;
    origem?: MovimentoEstoqueOrigemEnum;
    quantidade: number;
    criado_por?: number | null;
    atualizado_por?: number | null;
    inquilino: number;
    deletado_por?: number | null;
    lote: number;
    item_venda?: number | null;
};

