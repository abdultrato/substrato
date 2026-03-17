/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ResultadosInboxAplicado } from './ResultadosInboxAplicado';
export type ResultadosInboxResponse = {
    mensagem: string;
    ordem: string;
    ordem_estado: string;
    aplicados: Array<ResultadosInboxAplicado>;
    erros: Array<string>;
};

