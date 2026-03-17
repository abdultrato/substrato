/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UsuarioRequest = {
    password?: string;
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
    nome: string;
    first_name?: string;
    last_name?: string;
    email: string;
    telefone?: string | null;
    foto?: Blob | null;
    /**
     * Os grupos que este usuário pertence. Um usuário terá todas as permissões concedidas a cada um dos seus grupos.
     */
    groups?: Array<number>;
    /**
     * Permissões específicas para este usuário.
     */
    user_permissions?: Array<number>;
};

