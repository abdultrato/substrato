/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FaturaEstadoEnum } from './FaturaEstadoEnum';
import type { FaturaOrigemEnum } from './FaturaOrigemEnum';
export type Fatura = {
    readonly id?: number;
    readonly criado_em?: string;
    readonly atualizado_em?: string;
    readonly id_custom?: string | null;
    deletado?: boolean;
    deletado_em?: string | null;
    versao?: number;
    origem?: FaturaOrigemEnum;
    subtotal?: string;
    iva_valor?: string;
    total?: string;
    total_a_pagar?: string;
    valor_a_pagar?: string;
    valor_seguro?: string;
    valor_paciente?: string;
    estado?: FaturaEstadoEnum;
    criado_por?: number | null;
    atualizado_por?: number | null;
    inquilino: number;
    deletado_por?: number | null;
    requisicao?: number | null;
    venda?: number | null;
    /**
     * Legado: prefira usar o campo 'procedimentos' (múltiplos).
     */
    procedimento?: number | null;
    consulta?: number | null;
    cirurgia?: number | null;
    paciente?: number | null;
    /**
     * Pode associar múltiplos procedimentos de enfermagem à mesma fatura.
     */
    procedimentos?: Array<number>;
};
