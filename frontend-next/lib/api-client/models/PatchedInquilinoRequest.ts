/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { StatusComercialEnum } from './StatusComercialEnum';
export type PatchedInquilinoRequest = {
    deletado?: boolean;
    deletado_em?: string | null;
    versao?: number;
    nome?: string;
    identificador?: string;
    dominio?: string | null;
    ativo?: boolean;
    status_comercial?: StatusComercialEnum;
    trial_ate?: string | null;
    bloqueado_em?: string | null;
    criado_por?: number | null;
    atualizado_por?: number | null;
    deletado_por?: number | null;
};

