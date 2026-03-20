/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BlankEnum } from './BlankEnum';
import type { ExameMedicoMetodoEnum } from './ExameMedicoMetodoEnum';
import type { ExameMedicoSetorEnum } from './ExameMedicoSetorEnum';
import type { NullEnum } from './NullEnum';
/**
 * Serializer para Exame Médico (imagem/diagnóstico).
 */
export type ExameMedicoRequest = {
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
    /**
     * Desmarque se este exame normalmente não deve ter IVA.
     */
    aplica_iva_por_padrao?: boolean;
    metodo: ExameMedicoMetodoEnum;
    setor?: (ExameMedicoSetorEnum | BlankEnum | NullEnum) | null;
};

