/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FuncionarioEstadoEnum } from './FuncionarioEstadoEnum';
export type FuncionarioRequest = {
    versao?: number;
    nome: string;
    nuit?: string;
    nib?: string;
    numero_documento?: string;
    email?: string;
    telefone?: string;
    data_admissao?: string;
    estado?: FuncionarioEstadoEnum;
    salario_nominal?: string;
    /**
     * Valor adicional por promoção/aumento (somado ao salário nominal).
     */
    aumento_salarial?: string;
    /**
     * Horas contratuais base por mês (ex.: 176).
     */
    horas_base_mes?: number;
    cargo?: number | null;
};

