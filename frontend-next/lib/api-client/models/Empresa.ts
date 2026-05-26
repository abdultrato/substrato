/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Empresa = {
    readonly id?: number;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    name: string;
    nuit?: string | null;
    headquarters_address?: string | null;
    /**
     * Pessoa, departamento ou referência de contacto.
     */
    contacts?: string | null;
    email?: string | null;
    phone1?: string | null;
    phone2?: string | null;
    nib?: string | null;
    active?: boolean;
    notes?: string | null;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
};
