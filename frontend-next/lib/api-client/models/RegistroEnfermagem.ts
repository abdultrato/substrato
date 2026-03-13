/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RegistroEnfermagemPrioridadeEnum } from './RegistroEnfermagemPrioridadeEnum';
export type RegistroEnfermagem = {
    readonly id?: number;
    readonly criado_em?: string;
    readonly atualizado_em?: string;
    readonly id_custom?: string | null;
    deletado?: boolean;
    deletado_em?: string | null;
    versao?: number;
    nome: string;
    prioridade?: RegistroEnfermagemPrioridadeEnum;
    observacao?: string;
    readonly data_registro?: string;
    criado_por?: number | null;
    atualizado_por?: number | null;
    inquilino: number;
    deletado_por?: number | null;
    paciente: number;
};

