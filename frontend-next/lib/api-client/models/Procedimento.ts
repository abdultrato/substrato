/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Procedimento = {
    readonly id?: number;
    readonly criado_em?: string;
    readonly atualizado_em?: string;
    readonly id_custom?: string | null;
    deletado?: boolean;
    deletado_em?: string | null;
    versao?: number;
    data_realizacao?: string;
    observacoes?: string;
    subtotal_servicos?: string;
    subtotal_materiais?: string;
    total?: string;
    criado_por?: number | null;
    atualizado_por?: number | null;
    inquilino: number;
    deletado_por?: number | null;
    paciente: number;
    profissional?: number | null;
};

