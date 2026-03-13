/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProdutoTipoEnum } from './ProdutoTipoEnum';
export type ProdutoRequest = {
    deletado?: boolean;
    deletado_em?: string | null;
    versao?: number;
    nome: string;
    tipo?: ProdutoTipoEnum;
    preco_venda?: string;
    criado_por?: number | null;
    atualizado_por?: number | null;
    inquilino: number;
    deletado_por?: number | null;
    categoria?: number | null;
};

