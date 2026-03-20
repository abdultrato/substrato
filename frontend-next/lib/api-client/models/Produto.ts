/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProdutoTipoEnum } from './ProdutoTipoEnum';
export type Produto = {
    readonly id?: number;
    readonly criado_em?: string;
    readonly atualizado_em?: string;
    readonly id_custom?: string | null;
    deletado?: boolean;
    deletado_em?: string | null;
    versao?: number;
    nome: string;
    tipo?: ProdutoTipoEnum;
    preco_venda?: string;
    /**
     * Taxa de IVA aplicada ao produto (0 a 100).
     */
    iva_percentual?: string;
    /**
     * Desmarque se este produto normalmente não deve ter IVA.
     */
    aplica_iva_por_padrao?: boolean;
    criado_por?: number | null;
    atualizado_por?: number | null;
    inquilino: number;
    deletado_por?: number | null;
    categoria?: number | null;
};

