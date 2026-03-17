/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type EspecialidadeConsulta = {
    readonly id?: number;
    readonly criado_em?: string;
    readonly atualizado_em?: string;
    readonly id_custom?: string | null;
    readonly deletado?: boolean;
    readonly deletado_em?: string | null;
    readonly versao?: number;
    nome: string;
    descricao?: string;
    preco_base?: string;
    /**
     * Taxa de IVA aplicada ao serviço de consulta (0 a 100).
     */
    iva_percentual?: string;
    ativo?: boolean;
    readonly criado_por?: number | null;
    readonly atualizado_por?: number | null;
    readonly inquilino?: number;
    readonly deletado_por?: number | null;
};

