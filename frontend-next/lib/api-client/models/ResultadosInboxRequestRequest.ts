/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ResultadosInboxDocumentoRequest } from './ResultadosInboxDocumentoRequest';
import type { ResultadosInboxResultadoRequest } from './ResultadosInboxResultadoRequest';
export type ResultadosInboxRequestRequest = {
    message_id?: string;
    accession: string;
    results?: Array<ResultadosInboxResultadoRequest>;
    documentos?: Array<ResultadosInboxDocumentoRequest>;
};

