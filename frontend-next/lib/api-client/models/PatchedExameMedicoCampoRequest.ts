/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Tipo559Enum } from './Tipo559Enum';
/**
 * Serializer para parâmetros de exame médico.
 */
export type PatchedExameMedicoCampoRequest = {
    deletado?: boolean;
    deletado_em?: string | null;
    versao?: number;
    nome?: string;
    tipo?: Tipo559Enum;
    criado_por?: number | null;
    atualizado_por?: number | null;
    inquilino?: number;
    deletado_por?: number | null;
    exame?: number;
};

