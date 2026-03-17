/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EstadoResultadoEnum } from './EstadoResultadoEnum';
/**
 * Serializer para resultados de análises.
 * Contém os valores medidos para cada parâmetro.
 */
export type PatchedResultadoItemRequest = {
    deletado?: boolean;
    deletado_em?: string | null;
    versao?: number;
    resultado_valor?: string | null;
    status_clinico?: string;
    cor_laudo?: string | null;
    alerta_critico?: boolean;
    estado?: EstadoResultadoEnum;
    data_validacao?: string | null;
    criado_por?: number | null;
    atualizado_por?: number | null;
    inquilino?: number;
    deletado_por?: number | null;
    resultado?: number;
    exame_campo?: number;
    validado_por?: number | null;
};

