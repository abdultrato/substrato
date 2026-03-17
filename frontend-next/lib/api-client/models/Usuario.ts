/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Usuario = {
    readonly id?: number;
    last_login?: string | null;
    /**
     * Indica que este usuário tem todas as permissões sem atribuí-las explicitamente.
     */
    is_superuser?: boolean;
    /**
     * Obrigatório. 150 caracteres ou menos. Letras, números e @/./+/-/_ apenas.
     */
    username: string;
    /**
     * Indica que usuário consegue acessar este site de administração.
     */
    is_staff?: boolean;
    /**
     * Indica que o usuário será tratado como ativo. Ao invés de excluir contas de usuário, desmarque isso.
     */
    is_active?: boolean;
    date_joined?: string;
    readonly criado_em?: string;
    readonly atualizado_em?: string;
    readonly id_custom?: string | null;
    readonly deletado?: boolean;
    readonly deletado_em?: string | null;
    readonly versao?: number;
    nome: string;
    first_name?: string;
    last_name?: string;
    email: string;
    telefone?: string | null;
    foto?: string | null;
    readonly criado_por?: number | null;
    readonly atualizado_por?: number | null;
    readonly inquilino?: number;
    readonly deletado_por?: number | null;
    /**
     * Os grupos que este usuário pertence. Um usuário terá todas as permissões concedidas a cada um dos seus grupos.
     */
    groups?: Array<number>;
    /**
     * Permissões específicas para este usuário.
     */
    user_permissions?: Array<number>;
};

