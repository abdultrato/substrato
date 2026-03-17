/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FuncionarioEstadoEnum } from './FuncionarioEstadoEnum';
export type Funcionario = {
    readonly id?: number;
    readonly criado_em?: string;
    readonly atualizado_em?: string;
    readonly id_custom?: string | null;
    readonly deletado?: boolean;
    readonly deletado_em?: string | null;
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
    readonly criado_por?: number | null;
    readonly atualizado_por?: number | null;
    readonly inquilino?: number;
    readonly deletado_por?: number | null;
    cargo?: number | null;
};

