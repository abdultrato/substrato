/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BlankEnum } from './BlankEnum';
import type { MetodoLaboratorioEnum } from './MetodoLaboratorioEnum';
import type { NullEnum } from './NullEnum';
import type { SetorEnum } from './SetorEnum';
/**
 * Serializer para Exame Médico (imagem/diagnóstico).
 */
export type ExameMedico = {
    readonly id?: number;
    readonly criado_em?: string;
    readonly atualizado_em?: string;
    readonly id_custom?: string | null;
    readonly deletado?: boolean;
    readonly deletado_em?: string | null;
    readonly versao?: number;
    nome: string;
    /**
     * Tempo de resposta em horas.
     */
    trl_horas?: number;
    /**
     * Preço do exame médico.
     */
    preco?: string;
    /**
     * Taxa de IVA aplicada ao exame médico (0 a 100).
     */
    iva_percentual?: string;
    metodo: MetodoLaboratorioEnum;
    setor?: (SetorEnum | BlankEnum | NullEnum) | null;
    readonly criado_por?: number | null;
    readonly atualizado_por?: number | null;
    readonly inquilino?: number;
    readonly deletado_por?: number | null;
};

