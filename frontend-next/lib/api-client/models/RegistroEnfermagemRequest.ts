/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RegistroEnfermagemPrioridadeEnum } from './RegistroEnfermagemPrioridadeEnum';
export type RegistroEnfermagemRequest = {
    deletado?: boolean;
    deletado_em?: string | null;
    versao?: number;
    nome: string;
    prioridade?: RegistroEnfermagemPrioridadeEnum;
    observacao?: string;
    criado_por?: number | null;
    atualizado_por?: number | null;
    inquilino: number;
    deletado_por?: number | null;
    paciente: number;
};

