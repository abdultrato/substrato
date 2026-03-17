/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type EspecialidadeConsultaRequest = {
    nome: string;
    descricao?: string;
    preco_base?: string;
    /**
     * Taxa de IVA aplicada ao serviço de consulta (0 a 100).
     */
    iva_percentual?: string;
    ativo?: boolean;
};

