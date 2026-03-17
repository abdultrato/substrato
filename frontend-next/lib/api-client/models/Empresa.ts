/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Empresa = {
    readonly id?: number;
    readonly criado_em?: string;
    readonly atualizado_em?: string;
    readonly id_custom?: string | null;
    readonly deletado?: boolean;
    readonly deletado_em?: string | null;
    readonly versao?: number;
    nome: string;
    nuit?: string | null;
    endereco_sede?: string | null;
    /**
     * Pessoa, departamento ou referência de contacto.
     */
    contactos?: string | null;
    email?: string | null;
    telefone1?: string | null;
    telefone2?: string | null;
    nib?: string | null;
    ativo?: boolean;
    observacoes?: string | null;
    readonly criado_por?: number | null;
    readonly atualizado_por?: number | null;
    readonly inquilino?: number;
    readonly deletado_por?: number | null;
};

