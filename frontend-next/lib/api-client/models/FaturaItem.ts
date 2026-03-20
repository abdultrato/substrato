/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TipoItemEnum } from './TipoItemEnum';
export type FaturaItem = {
    readonly id?: number;
    readonly total_sem_iva?: string;
    readonly iva_valor?: string;
    readonly total_com_iva?: string;
    readonly criado_em?: string;
    readonly atualizado_em?: string;
    readonly id_custom?: string | null;
    deletado?: boolean;
    deletado_em?: string | null;
    versao?: number;
    tipo_item?: TipoItemEnum;
    descricao?: string;
    quantidade?: string;
    preco_unitario?: string;
    /**
     * Desmarque para não aplicar IVA neste item.
     */
    aplica_iva?: boolean;
    /**
     * Deixe em branco para herdar do item (exame/produto/procedimento).
     */
    iva_percentual?: string | null;
    criado_por?: number | null;
    atualizado_por?: number | null;
    inquilino: number;
    deletado_por?: number | null;
    fatura: number;
    exame?: number | null;
    exame_medico?: number | null;
    item_venda?: number | null;
    procedimento_item?: number | null;
    procedimento_material?: number | null;
};

