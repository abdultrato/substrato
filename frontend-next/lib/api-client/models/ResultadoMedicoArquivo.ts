/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Tipo559Enum } from './Tipo559Enum';
export type ResultadoMedicoArquivo = {
    readonly id?: number;
    arquivo: string;
    readonly criado_em?: string;
    readonly atualizado_em?: string;
    readonly id_custom?: string | null;
    deletado?: boolean;
    deletado_em?: string | null;
    versao?: number;
    tipo?: Tipo559Enum;
    descricao?: string;
    criado_por?: number | null;
    atualizado_por?: number | null;
    inquilino: number;
    deletado_por?: number | null;
    resultado: number;
    requisicao_item?: number | null;
    exame_medico: number;
};

