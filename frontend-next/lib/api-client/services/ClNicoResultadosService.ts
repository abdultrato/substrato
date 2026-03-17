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
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param resultado
     * @param search Um termo de busca.
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
        estado?: 'aguardando_validacao' | 'em_analise' | 'pendente' | 'rejeitado' | 'validado',
        exameCampo?: number,
        idCustom?: string,
        inquilino?: number,
        ordering?: string,
        resultado?: number,
        search?: string,
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
                'ordering': ordering,
                'resultado': resultado,
                'search': search,
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
     * @param id Um valor inteiro único que identifica este resultado item.
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
     * @param id Um valor inteiro único que identifica este resultado item.
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
     * @param id Um valor inteiro único que identifica este resultado item.
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
     * @param id Um valor inteiro único que identifica este resultado item.
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
    /**
     * Gerenciamento de resultados de análises
     * @param id Um valor inteiro único que identifica este resultado item.
     * @param requestBody
     * @returns ResultadoItem
     * @throws ApiError
     */
    public static v1ClinicoResultadoitemGravarCreate(
        id: number,
        requestBody: ResultadoItemRequest,
    ): CancelablePromise<ResultadoItem> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/clinico/resultadoitem/{id}/gravar/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Gerenciamento de resultados de análises
     * @param id Um valor inteiro único que identifica este resultado item.
     * @param requestBody
     * @returns ResultadoItem
     * @throws ApiError
     */
    public static v1ClinicoResultadoitemLancarCreate(
        id: number,
        requestBody: ResultadoItemRequest,
    ): CancelablePromise<ResultadoItem> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/clinico/resultadoitem/{id}/lancar/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Gerenciamento de resultados de análises
     * @param id Um valor inteiro único que identifica este resultado item.
     * @param requestBody
     * @returns ResultadoItem
     * @throws ApiError
     */
    public static v1ClinicoResultadoitemValidarCreate(
        id: number,
        requestBody: ResultadoItemRequest,
    ): CancelablePromise<ResultadoItem> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/clinico/resultadoitem/{id}/validar/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
