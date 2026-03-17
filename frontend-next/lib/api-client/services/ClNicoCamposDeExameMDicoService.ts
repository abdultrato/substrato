/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExameMedicoCampo } from '../models/ExameMedicoCampo';
import type { ExameMedicoCampoRequest } from '../models/ExameMedicoCampoRequest';
import type { PatchedExameMedicoCampoRequest } from '../models/PatchedExameMedicoCampoRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ClNicoCamposDeExameMDicoService {
    /**
     * Gerenciamento de campos de exames médicos
     * @param atualizadoEm
     * @param atualizadoPor
     * @param criadoEm
     * @param criadoPor
     * @param exame
     * @param idCustom
     * @param inquilino
     * @param nome
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param search Um termo de busca.
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
     * * `x10⁶/µL` - x10⁶/µL
     * * `%` - %
     * * `u/l` - u/l
     * * `p/µL` - p/µL
     * * `ph` - ph
     * * `fl` - fl
     * @returns ExameMedicoCampo
     * @throws ApiError
     */
    public static v1ClinicoExamemedicocampoList(
        atualizadoEm?: string,
        atualizadoPor?: number,
        criadoEm?: string,
        criadoPor?: number,
        exame?: number,
        idCustom?: string,
        inquilino?: number,
        nome?: string,
        ordering?: string,
        search?: string,
        tipo?: 'NUMERICO' | 'QUALITATIVO' | 'SEMIQUANTITATIVO' | 'TEXTO',
        unidade?: '%' | 'cel/mm3' | 'fl' | 'g/dl' | 'mg/dl' | 'mmol/l' | 'p/µL' | 'ph' | 'u/l' | 'x10³/µl' | 'x10⁶/µL' | 'µmol/l',
    ): CancelablePromise<Array<ExameMedicoCampo>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinico/examemedicocampo/',
            query: {
                'atualizado_em': atualizadoEm,
                'atualizado_por': atualizadoPor,
                'criado_em': criadoEm,
                'criado_por': criadoPor,
                'exame': exame,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'nome': nome,
                'ordering': ordering,
                'search': search,
                'tipo': tipo,
                'unidade': unidade,
            },
        });
    }
    /**
     * Gerenciamento de campos de exames médicos
     * @param requestBody
     * @returns ExameMedicoCampo
     * @throws ApiError
     */
    public static v1ClinicoExamemedicocampoCreate(
        requestBody: ExameMedicoCampoRequest,
    ): CancelablePromise<ExameMedicoCampo> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/clinico/examemedicocampo/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Gerenciamento de campos de exames médicos
     * @param id Um valor inteiro único que identifica este parâmetro de exame médico.
     * @returns ExameMedicoCampo
     * @throws ApiError
     */
    public static v1ClinicoExamemedicocampoRetrieve(
        id: number,
    ): CancelablePromise<ExameMedicoCampo> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinico/examemedicocampo/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Gerenciamento de campos de exames médicos
     * @param id Um valor inteiro único que identifica este parâmetro de exame médico.
     * @param requestBody
     * @returns ExameMedicoCampo
     * @throws ApiError
     */
    public static v1ClinicoExamemedicocampoUpdate(
        id: number,
        requestBody: ExameMedicoCampoRequest,
    ): CancelablePromise<ExameMedicoCampo> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/clinico/examemedicocampo/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Gerenciamento de campos de exames médicos
     * @param id Um valor inteiro único que identifica este parâmetro de exame médico.
     * @param requestBody
     * @returns ExameMedicoCampo
     * @throws ApiError
     */
    public static v1ClinicoExamemedicocampoPartialUpdate(
        id: number,
        requestBody?: PatchedExameMedicoCampoRequest,
    ): CancelablePromise<ExameMedicoCampo> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/clinico/examemedicocampo/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Gerenciamento de campos de exames médicos
     * @param id Um valor inteiro único que identifica este parâmetro de exame médico.
     * @returns void
     * @throws ApiError
     */
    public static v1ClinicoExamemedicocampoDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/clinico/examemedicocampo/{id}/',
            path: {
                'id': id,
            },
        });
    }
}
