/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PatchedResultadoItemRequest } from '../models/PatchedResultadoItemRequest';
import type { ResultadoItem } from '../models/ResultadoItem';
import type { ResultadoItemRequest } from '../models/ResultadoItemRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ClNicoResultadosService {
    /**
     * Gerenciamento de resultados de análises
     * @param alertaCritico
     * @param atualizadoEm
     * @param atualizadoPor
     * @param corLaudo
     * @param criadoEm
     * @param criadoPor
     * @param dataValidacao
     * @param estado * `pendente` - Pendente
     * * `em_analise` - Em Análise
     * * `aguardando_validacao` - Aguardando Validação
     * * `validado` - Validado
     * * `rejeitado` - Rejeitado
     * @param exameCampo
     * @param idCustom
     * @param inquilino
     * @param resultado
     * @param statusClinico
     * @param validadoPor
     * @returns ResultadoItem
     * @throws ApiError
     */
    public static v1ClinicoResultadoitemList(
        alertaCritico?: boolean,
        atualizadoEm?: string,
        atualizadoPor?: number,
        corLaudo?: string,
        criadoEm?: string,
        criadoPor?: number,
        dataValidacao?: string,
        estado: 'aguardando_validacao' | 'em_analise' | 'pendente' | 'rejeitado' | 'validado' = 'pendente',
        exameCampo?: number,
        idCustom?: string,
        inquilino?: number,
        resultado?: number,
        statusClinico?: string,
        validadoPor?: number,
    ): CancelablePromise<Array<ResultadoItem>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinico/resultadoitem/',
            query: {
                'alerta_critico': alertaCritico,
                'atualizado_em': atualizadoEm,
                'atualizado_por': atualizadoPor,
                'cor_laudo': corLaudo,
                'criado_em': criadoEm,
                'criado_por': criadoPor,
                'data_validacao': dataValidacao,
                'estado': estado,
                'exame_campo': exameCampo,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'resultado': resultado,
                'status_clinico': statusClinico,
                'validado_por': validadoPor,
            },
        });
    }
    /**
     * Gerenciamento de resultados de análises
     * @param requestBody
     * @returns ResultadoItem
     * @throws ApiError
     */
    public static v1ClinicoResultadoitemCreate(
        requestBody: ResultadoItemRequest,
    ): CancelablePromise<ResultadoItem> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/clinico/resultadoitem/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Gerenciamento de resultados de análises
     * @param id A unique integer value identifying this resultado item.
     * @returns ResultadoItem
     * @throws ApiError
     */
    public static v1ClinicoResultadoitemRetrieve(
        id: number,
    ): CancelablePromise<ResultadoItem> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinico/resultadoitem/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Gerenciamento de resultados de análises
     * @param id A unique integer value identifying this resultado item.
     * @param requestBody
     * @returns ResultadoItem
     * @throws ApiError
     */
    public static v1ClinicoResultadoitemUpdate(
        id: number,
        requestBody: ResultadoItemRequest,
    ): CancelablePromise<ResultadoItem> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/clinico/resultadoitem/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Gerenciamento de resultados de análises
     * @param id A unique integer value identifying this resultado item.
     * @param requestBody
     * @returns ResultadoItem
     * @throws ApiError
     */
    public static v1ClinicoResultadoitemPartialUpdate(
        id: number,
        requestBody?: PatchedResultadoItemRequest,
    ): CancelablePromise<ResultadoItem> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/clinico/resultadoitem/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Gerenciamento de resultados de análises
     * @param id A unique integer value identifying this resultado item.
     * @returns void
     * @throws ApiError
     */
    public static v1ClinicoResultadoitemDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/clinico/resultadoitem/{id}/',
            path: {
                'id': id,
            },
        });
    }
}
