/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PatchedResultadoMedicoArquivoRequest } from '../models/PatchedResultadoMedicoArquivoRequest';
import type { ResultadoMedicoArquivo } from '../models/ResultadoMedicoArquivo';
import type { ResultadoMedicoArquivoRequest } from '../models/ResultadoMedicoArquivoRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ClNicoResultadosMDicosService {
    /**
     * Lista arquivos (PDF/imagens) associados a um exame médico.
     * @param atualizadoEm
     * @param criadoEm
     * @param exameMedico
     * @param idCustom
     * @param inquilino
     * @param ordering
     * @param requisicaoItem
     * @param resultado
     * @param search
     * @param tipo * `PDF` - Laudo/Relatório (PDF)
     * * `IMAGEM` - Imagem (JPEG/PNG)
     * * `DICOM` - DICOM
     * * `VIDEO` - Vídeo/loop
     * * `TEXTO` - Texto livre
     * * `NUMERICO` - Valor numérico
     * @returns ResultadoMedicoArquivo
     * @throws ApiError
     */
    public static v1ClinicoResultadomedicoarquivoList(
        atualizadoEm?: string,
        criadoEm?: string,
        exameMedico?: number,
        idCustom?: string,
        inquilino?: number,
        ordering?: string,
        requisicaoItem?: number,
        resultado?: number,
        search?: string,
        tipo?: 'DICOM' | 'IMAGEM' | 'NUMERICO' | 'PDF' | 'TEXTO' | 'VIDEO',
    ): CancelablePromise<Array<ResultadoMedicoArquivo>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinico/resultadomedicoarquivo/',
            query: {
                'atualizado_em': atualizadoEm,
                'criado_em': criadoEm,
                'exame_medico': exameMedico,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'ordering': ordering,
                'requisicao_item': requisicaoItem,
                'resultado': resultado,
                'search': search,
                'tipo': tipo,
            },
        });
    }
    /**
     * Arquivos/links gerados para exames médicos (imagens, laudos, DICOM).
     * @param requestBody
     * @returns ResultadoMedicoArquivo
     * @throws ApiError
     */
    public static v1ClinicoResultadomedicoarquivoCreate(
        requestBody: ResultadoMedicoArquivoRequest,
    ): CancelablePromise<ResultadoMedicoArquivo> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/clinico/resultadomedicoarquivo/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Arquivos/links gerados para exames médicos (imagens, laudos, DICOM).
     * @param id Um valor inteiro único que identifica este Arquivo de resultado médico.
     * @returns ResultadoMedicoArquivo
     * @throws ApiError
     */
    public static v1ClinicoResultadomedicoarquivoRetrieve(
        id: number,
    ): CancelablePromise<ResultadoMedicoArquivo> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinico/resultadomedicoarquivo/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Arquivos/links gerados para exames médicos (imagens, laudos, DICOM).
     * @param id Um valor inteiro único que identifica este Arquivo de resultado médico.
     * @param requestBody
     * @returns ResultadoMedicoArquivo
     * @throws ApiError
     */
    public static v1ClinicoResultadomedicoarquivoUpdate(
        id: number,
        requestBody: ResultadoMedicoArquivoRequest,
    ): CancelablePromise<ResultadoMedicoArquivo> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/clinico/resultadomedicoarquivo/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Arquivos/links gerados para exames médicos (imagens, laudos, DICOM).
     * @param id Um valor inteiro único que identifica este Arquivo de resultado médico.
     * @param requestBody
     * @returns ResultadoMedicoArquivo
     * @throws ApiError
     */
    public static v1ClinicoResultadomedicoarquivoPartialUpdate(
        id: number,
        requestBody?: PatchedResultadoMedicoArquivoRequest,
    ): CancelablePromise<ResultadoMedicoArquivo> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/clinico/resultadomedicoarquivo/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Arquivos/links gerados para exames médicos (imagens, laudos, DICOM).
     * @param id Um valor inteiro único que identifica este Arquivo de resultado médico.
     * @returns void
     * @throws ApiError
     */
    public static v1ClinicoResultadomedicoarquivoDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/clinico/resultadomedicoarquivo/{id}/',
            path: {
                'id': id,
            },
        });
    }
}
