/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UsuarioAuditoria = {
    readonly id?: number;
    /**
     * Obrigatório. 150 caracteres ou menos. Letras, números e @/./+/-/_ apenas.
     */
    username: string;
    first_name?: string;
    last_name?: string;
    readonly nome?: string;
    readonly grupos?: Array<string>;
    readonly total_atividades?: number;
    readonly ultima_atividade_em?: string;
};

