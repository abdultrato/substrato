/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ErroSistema = {
    readonly id?: number;
    readonly usuario_nome?: string;
    readonly criado_em?: string;
    readonly atualizado_em?: string;
    readonly id_custom?: string | null;
    readonly deletado?: boolean;
    readonly deletado_em?: string | null;
    readonly versao?: number;
    metodo: string;
    caminho: string;
    path_completo?: string;
    status_code?: number;
    duracao_ms?: number | null;
    ip?: string | null;
    user_agent?: string;
    view_basename?: string;
    view_action?: string;
    objeto_id?: string;
    exception_class?: string;
    mensagem?: string;
    traceback?: string;
    metadata?: any;
    readonly criado_por?: number | null;
    readonly atualizado_por?: number | null;
    readonly inquilino?: number;
    readonly deletado_por?: number | null;
    usuario?: number | null;
};

