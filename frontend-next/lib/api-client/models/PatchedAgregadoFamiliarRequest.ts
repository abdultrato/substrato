/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ParentescoEnum } from './ParentescoEnum';
export type PatchedAgregadoFamiliarRequest = {
    versao?: number;
    nome?: string;
    parentesco?: ParentescoEnum;
    data_nascimento?: string | null;
    telefone?: string;
    vive_com_funcionario?: boolean;
    observacoes?: string;
    funcionario?: number;
};

