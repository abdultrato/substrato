/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TipoResultadoEnum } from './TipoResultadoEnum';
import type { UnidadeEnum } from './UnidadeEnum';
/**
 * Serializer para parâmetros de exame médico.
 */
export type ExameMedicoCampo = {
    readonly id?: number;
    readonly criado_em?: string;
    readonly atualizado_em?: string;
    readonly id_custom?: string | null;
    deletado?: boolean;
    deletado_em?: string | null;
    versao?: number;
    nome: string;
    tipo: TipoResultadoEnum;
    unidade?: UnidadeEnum;
    referencia_min?: string | null;
    referencia_max?: string | null;
    critico_min?: string | null;
    critico_max?: string | null;
    delta_max?: string | null;
    criado_por?: number | null;
    atualizado_por?: number | null;
    inquilino: number;
    deletado_por?: number | null;
    exame: number;
};

