/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PatchedRequisicaoAnaliseRequest } from '../models/PatchedRequisicaoAnaliseRequest';
import type { PatchedRequisicaoItemRequest } from '../models/PatchedRequisicaoItemRequest';
import type { RequisicaoAnalise } from '../models/RequisicaoAnalise';
import type { RequisicaoAnaliseRequest } from '../models/RequisicaoAnaliseRequest';
import type { RequisicaoItem } from '../models/RequisicaoItem';
import type { RequisicaoItemRequest } from '../models/RequisicaoItemRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ClNicoRequisiEsService {
    /**
     * Gerenciamento de requisições de análise
     * @param analista
     * @param atualizadoEm
     * @param atualizadoPor
     * @param criadoEm
     * @param criadoPor
     * @param estado * `pendente` - Pendente
     * * `em_analise` - Em Análise
     * * `aguardando_validacao` - Aguardando Validação
     * * `validado` - Validado
     * * `rejeitado` - Rejeitado
     * @param idCustom
     * @param inquilino
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param paciente
     * @param possuiResultadoCritico
     * @param search Um termo de busca.
     * @param statusClinico * `NAO_URGENTE` - Não urgente
     * * `NORMAL` - Normal
     * * `ROTINA` - Rotina
     * * `POUCO_URGENTE` - Pouco urgente
     * * `PRIORITARIO` - Prioritário
     * * `URGENTE` - Urgente
     * * `MUITO_URGENTE` - Muito urgente
     * * `URGENTISSIMO` - Urgentíssimo
     * * `EMERGENCIA` - Emergência
     * @param tipo * `LAB` - Laboratório
     * * `MED` - Exame médico
     * @returns RequisicaoAnalise
     * @throws ApiError
     */
    public static v1ClinicoRequisicaoanaliseList(
        analista?: number,
        atualizadoEm?: string,
        atualizadoPor?: number,
        criadoEm?: string,
        criadoPor?: number,
        estado?: 'aguardando_validacao' | 'em_analise' | 'pendente' | 'rejeitado' | 'validado',
        idCustom?: string,
        inquilino?: number,
        ordering?: string,
        paciente?: number,
        possuiResultadoCritico?: boolean,
        search?: string,
        statusClinico?: 'EMERGENCIA' | 'MUITO_URGENTE' | 'NAO_URGENTE' | 'NORMAL' | 'POUCO_URGENTE' | 'PRIORITARIO' | 'ROTINA' | 'URGENTE' | 'URGENTISSIMO',
        tipo?: 'LAB' | 'MED',
    ): CancelablePromise<Array<RequisicaoAnalise>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinico/requisicaoanalise/',
            query: {
                'analista': analista,
                'atualizado_em': atualizadoEm,
                'atualizado_por': atualizadoPor,
                'criado_em': criadoEm,
                'criado_por': criadoPor,
                'estado': estado,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'ordering': ordering,
                'paciente': paciente,
                'possui_resultado_critico': possuiResultadoCritico,
                'search': search,
                'status_clinico': statusClinico,
                'tipo': tipo,
            },
        });
    }
    /**
     * Gerenciamento de requisições de análise
     * @param requestBody
     * @returns RequisicaoAnalise
     * @throws ApiError
     */
    public static v1ClinicoRequisicaoanaliseCreate(
        requestBody: RequisicaoAnaliseRequest,
    ): CancelablePromise<RequisicaoAnalise> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/clinico/requisicaoanalise/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Gerenciamento de requisições de análise
     * @param id Um valor inteiro único que identifica este Requisição de exame.
     * @returns RequisicaoAnalise
     * @throws ApiError
     */
    public static v1ClinicoRequisicaoanaliseRetrieve(
        id: number,
    ): CancelablePromise<RequisicaoAnalise> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinico/requisicaoanalise/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Gerenciamento de requisições de análise
     * @param id Um valor inteiro único que identifica este Requisição de exame.
     * @param requestBody
     * @returns RequisicaoAnalise
     * @throws ApiError
     */
    public static v1ClinicoRequisicaoanaliseUpdate(
        id: number,
        requestBody: RequisicaoAnaliseRequest,
    ): CancelablePromise<RequisicaoAnalise> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/clinico/requisicaoanalise/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Gerenciamento de requisições de análise
     * @param id Um valor inteiro único que identifica este Requisição de exame.
     * @param requestBody
     * @returns RequisicaoAnalise
     * @throws ApiError
     */
    public static v1ClinicoRequisicaoanalisePartialUpdate(
        id: number,
        requestBody?: PatchedRequisicaoAnaliseRequest,
    ): CancelablePromise<RequisicaoAnalise> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/clinico/requisicaoanalise/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Gerenciamento de requisições de análise
     * @param id Um valor inteiro único que identifica este Requisição de exame.
     * @returns void
     * @throws ApiError
     */
    public static v1ClinicoRequisicaoanaliseDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/clinico/requisicaoanalise/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Gerenciamento de requisições de análise
     * @param id Um valor inteiro único que identifica este Requisição de exame.
     * @returns RequisicaoAnalise
     * @throws ApiError
     */
    public static v1ClinicoRequisicaoanalisePdfResultadosRetrieve(
        id: number,
    ): CancelablePromise<RequisicaoAnalise> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinico/requisicaoanalise/{id}/pdf_resultados/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Gerenciamento de requisições de análise
     * @param id Um valor inteiro único que identifica este Requisição de exame.
     * @returns RequisicaoAnalise
     * @throws ApiError
     */
    public static v1ClinicoRequisicaoanaliseResultadoItensRetrieve(
        id: number,
    ): CancelablePromise<RequisicaoAnalise> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinico/requisicaoanalise/{id}/resultado_itens/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Gerenciamento de itens de requisição
     * @param atualizadoEm
     * @param atualizadoPor
     * @param criadoEm
     * @param criadoPor
     * @param exame
     * @param exameMedico
     * @param idCustom
     * @param inquilino
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param requisicao
     * @param search Um termo de busca.
     * @returns RequisicaoItem
     * @throws ApiError
     */
    public static v1ClinicoRequisicaoitemList(
        atualizadoEm?: string,
        atualizadoPor?: number,
        criadoEm?: string,
        criadoPor?: number,
        exame?: number,
        exameMedico?: number,
        idCustom?: string,
        inquilino?: number,
        ordering?: string,
        requisicao?: number,
        search?: string,
    ): CancelablePromise<Array<RequisicaoItem>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinico/requisicaoitem/',
            query: {
                'atualizado_em': atualizadoEm,
                'atualizado_por': atualizadoPor,
                'criado_em': criadoEm,
                'criado_por': criadoPor,
                'exame': exame,
                'exame_medico': exameMedico,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'ordering': ordering,
                'requisicao': requisicao,
                'search': search,
            },
        });
    }
    /**
     * Gerenciamento de itens de requisição
     * @param requestBody
     * @returns RequisicaoItem
     * @throws ApiError
     */
    public static v1ClinicoRequisicaoitemCreate(
        requestBody: RequisicaoItemRequest,
    ): CancelablePromise<RequisicaoItem> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/clinico/requisicaoitem/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Gerenciamento de itens de requisição
     * @param id Um valor inteiro único que identifica este requisicao item.
     * @returns RequisicaoItem
     * @throws ApiError
     */
    public static v1ClinicoRequisicaoitemRetrieve(
        id: number,
    ): CancelablePromise<RequisicaoItem> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinico/requisicaoitem/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Gerenciamento de itens de requisição
     * @param id Um valor inteiro único que identifica este requisicao item.
     * @param requestBody
     * @returns RequisicaoItem
     * @throws ApiError
     */
    public static v1ClinicoRequisicaoitemUpdate(
        id: number,
        requestBody: RequisicaoItemRequest,
    ): CancelablePromise<RequisicaoItem> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/clinico/requisicaoitem/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Gerenciamento de itens de requisição
     * @param id Um valor inteiro único que identifica este requisicao item.
     * @param requestBody
     * @returns RequisicaoItem
     * @throws ApiError
     */
    public static v1ClinicoRequisicaoitemPartialUpdate(
        id: number,
        requestBody?: PatchedRequisicaoItemRequest,
    ): CancelablePromise<RequisicaoItem> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/clinico/requisicaoitem/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Gerenciamento de itens de requisição
     * @param id Um valor inteiro único que identifica este requisicao item.
     * @returns void
     * @throws ApiError
     */
    public static v1ClinicoRequisicaoitemDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/clinico/requisicaoitem/{id}/',
            path: {
                'id': id,
            },
        });
    }
}
