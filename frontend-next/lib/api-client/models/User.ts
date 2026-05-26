/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type User = {
    readonly id?: number;
    password?: string;
    readonly group_names?: string;
    last_login?: string | null;
    /**
     * Define se este utilizador tem todas as permissões sem explicitamente as atribuir.
     */
    is_superuser?: boolean;
    /**
     * Obrigatório. 150 carateres ou menos. Apenas letras, dígitos @/./+/-/_.
     */
    username: string;
    /**
     * Define se o utilizador pode usar a administração do site.
     */
    is_staff?: boolean;
    /**
     * Defina se este utilizador deva ser tratado como ativo. Não selecione em vez de remover as contas.
     */
    is_active?: boolean;
    date_joined?: string;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    name: string;
    first_name?: string;
    last_name?: string;
    email: string;
    phone?: string | null;
    photo?: Blob | null;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    /**
     * Os grupos que este utilizador pertence. Um utilizador terá todas as permissões concedidas a cada um dos seus grupos.
     */
    groups?: Array<number>;
    /**
     * Permissões específicas para este utilizador.
     */
    user_permissions?: Array<number>;
};
