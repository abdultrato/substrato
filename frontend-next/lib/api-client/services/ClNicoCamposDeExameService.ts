/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExameCampo } from '../models/ExameCampo';
import type { ExameCampoRequest } from '../models/ExameCampoRequest';
import type { PatchedExameCampoRequest } from '../models/PatchedExameCampoRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ClNicoCamposDeExameService {
    /**
     * Gerenciamento de campos de exames
     * @param atualizadoEm
     * @param atualizadoPor
     * @param criadoEm
     * @param criadoPor
     * @param exame
     * @param idCustom
     * @param inquilino
     * @param nome
     * @param tipo * `NUMERICO` - Numérico
     * * `QUALITATIVO` - Qualitativo
     * * `SEMIQUANTITATIVO` - Semi-quantitativo
     * * `TEXTO` - Texto Livre
     * @param unidade * `g/dl` - g/dl
     * * `mg/dl` - mg/dl
     * * `mmol/l` - mmol/l
     * * `µmol/l` - µmol/l
     * * `cel/mm3` - cel/mm3
     * * `x10³/µl` - x10³/µl
     * * `×10⁶/µL` - ×10⁶/µL
     * * `%` - %
     * * `u/l` - u/l
     * * `p/µL` - p/µL
     * * `ph` - ph
     * * `fl` - fl
     * @returns ExameCampo
     * @throws ApiError
     */
    public static v1ClinicoExamecampoList(
        atualizadoEm?: string,
        atualizadoPor?: number,
        criadoEm?: string,
        criadoPor?: number,
        exame?: number,
        idCustom?: string,
        inquilino?: number,
        nome?: string,
        tipo?: 'NUMERICO' | 'QUALITATIVO' | 'SEMIQUANTITATIVO' | 'TEXTO',
        unidade: '%' | 'cel/mm3' | 'fl' | 'g/dl' | 'mg/dl' | 'mmol/l' | 'p/µL' | 'ph' | 'u/l' | 'x10³/µl' | 'µmol/l' | '×10⁶/µL' = 'p/µL',
    ): CancelablePromise<Array<ExameCampo>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinico/examecampo/',
            query: {
                'atualizado_em': atualizadoEm,
                'atualizado_por': atualizadoPor,
                'criado_em': criadoEm,
                'criado_por': criadoPor,
                'exame': exame,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'nome': nome,
                'tipo': tipo,
                'unidade': unidade,
            },
        });
    }
    /**
     * Gerenciamento de campos de exames
     * @param requestBody
     * @returns ExameCampo
     * @throws ApiError
     */
    public static v1ClinicoExamecampoCreate(
        requestBody: ExameCampoRequest,
    ): CancelablePromise<ExameCampo> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/clinico/examecampo/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Gerenciamento de campos de exames
     * @param id A unique integer value identifying this parâmetro.
     * @returns ExameCampo
     * @throws ApiError
     */
    public static v1ClinicoExamecampoRetrieve(
        id: number,
    ): CancelablePromise<ExameCampo> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinico/examecampo/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Gerenciamento de campos de exames
     * @param id A unique integer value identifying this parâmetro.
     * @param requestBody
     * @returns ExameCampo
     * @throws ApiError
     */
    public static v1ClinicoExamecampoUpdate(
        id: number,
        requestBody: ExameCampoRequest,
    ): CancelablePromise<ExameCampo> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/clinico/examecampo/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Gerenciamento de campos de exames
     * @param id A unique integer value identifying this parâmetro.
     * @param requestBody
     * @returns ExameCampo
     * @throws ApiError
     */
    public static v1ClinicoExamecampoPartialUpdate(
        id: number,
        requestBody?: PatchedExameCampoRequest,
    ): CancelablePromise<ExameCampo> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/clinico/examecampo/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Gerenciamento de campos de exames
     * @param id A unique integer value identifying this parâmetro.
     * @returns void
     * @throws ApiError
     */
    public static v1ClinicoExamecampoDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/clinico/examecampo/{id}/',
            path: {
                'id': id,
            },
        });
    }
}
