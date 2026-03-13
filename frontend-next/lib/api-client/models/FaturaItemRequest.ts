/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TipoItemEnum } from './TipoItemEnum';
export type FaturaItemRequest = {
    deletado?: boolean;
    deletado_em?: string | null;
    versao?: number;
    tipo_item?: TipoItemEnum;
    descricao?: string;
    quantidade?: string;
    preco_unitario?: string;
    criado_por?: number | null;
    atualizado_por?: number | null;
    inquilino: number;
    deletado_por?: number | null;
    fatura: number;
    exame: number | null;
    item_venda: number | null;
    procedimento_item: number | null;
    procedimento_material: number | null;
};

