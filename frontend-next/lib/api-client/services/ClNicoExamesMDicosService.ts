/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExameMedico } from '../models/ExameMedico';
import type { ExameMedicoRequest } from '../models/ExameMedicoRequest';
import type { PatchedExameMedicoRequest } from '../models/PatchedExameMedicoRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ClNicoExamesMDicosService {
    /**
     * Gerenciamento de exames médicos (imagem/diagnóstico)
     * @param atualizadoEm
     * @param atualizadoPor
     * @param criadoEm
     * @param criadoPor
     * @param deletado
     * @param idCustom
     * @param inquilino
     * @param metodo * `USG` - Ultrassonografia / Ecografia
     * * `RX` - Raio-X Convencional
     * * `CT` - Tomografia Computorizada (CT)
     * * `RM` - Ressonância Magnética (RM)
     * * `MG` - Mamografia
     * * `DXA` - Densitometria Óssea (DXA)
     * * `ECO` - Ecocardiograma
     * * `ECG` - Eletrocardiograma (ECG)
     * * `HOLTER` - Holter
     * * `MAPA` - MAPA (PA 24h)
     * * `EEG` - Eletroencefalograma (EEG)
     * * `ENDO` - Endoscopia
     * * `COLONO` - Colonoscopia
     * * `ANGIO` - Angiografia
     * * `MN` - Medicina Nuclear / Cintilografia
     * * `OUT` - Outro
     * @param nome
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param preco
     * @param search Um termo de busca.
     * @param setor * `Radiologia` - Radiologia
     * * `DiagnosticoImagem` - Diagnóstico por Imagem
     * * `Cardiologia` - Cardiologia
     * * `GinecoObstetricia` - Ginecologia/Obstetrícia
     * * `Ortopedia` - Ortopedia/Traumato
     * * `Neurologia` - Neurologia
     * * `Otorrino` - Otorrinolaringologia
     * * `Oftalmologia` - Oftalmologia
     * * `MedicinaNuclear` - Medicina Nuclear
     * * `Endoscopia` - Endoscopia
     * * `Outro` - Outro
     * @param trlHoras
     * @returns ExameMedico
     * @throws ApiError
     */
    public static v1ClinicoExamemedicoList(
        atualizadoEm?: string,
        atualizadoPor?: number,
        criadoEm?: string,
        criadoPor?: number,
        deletado?: boolean,
        idCustom?: string,
        inquilino?: number,
        metodo?: 'ANGIO' | 'COLONO' | 'CT' | 'DXA' | 'ECG' | 'ECO' | 'EEG' | 'ENDO' | 'HOLTER' | 'MAPA' | 'MG' | 'MN' | 'OUT' | 'RM' | 'RX' | 'USG',
        nome?: string,
        ordering?: string,
        preco?: number,
        search?: string,
        setor?: 'Cardiologia' | 'DiagnosticoImagem' | 'Endoscopia' | 'GinecoObstetricia' | 'MedicinaNuclear' | 'Neurologia' | 'Oftalmologia' | 'Ortopedia' | 'Otorrino' | 'Outro' | 'Radiologia' | null,
        trlHoras?: number,
    ): CancelablePromise<Array<ExameMedico>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinico/examemedico/',
            query: {
                'atualizado_em': atualizadoEm,
                'atualizado_por': atualizadoPor,
                'criado_em': criadoEm,
                'criado_por': criadoPor,
                'deletado': deletado,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'metodo': metodo,
                'nome': nome,
                'ordering': ordering,
                'preco': preco,
                'search': search,
                'setor': setor,
                'trl_horas': trlHoras,
            },
        });
    }
    /**
     * Gerenciamento de exames médicos (imagem/diagnóstico)
     * @param requestBody
     * @returns ExameMedico
     * @throws ApiError
     */
    public static v1ClinicoExamemedicoCreate(
        requestBody: ExameMedicoRequest,
    ): CancelablePromise<ExameMedico> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/clinico/examemedico/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Gerenciamento de exames médicos (imagem/diagnóstico)
     * @param id Um valor inteiro único que identifica este Exame médico.
     * @returns ExameMedico
     * @throws ApiError
     */
    public static v1ClinicoExamemedicoRetrieve(
        id: number,
    ): CancelablePromise<ExameMedico> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinico/examemedico/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Gerenciamento de exames médicos (imagem/diagnóstico)
     * @param id Um valor inteiro único que identifica este Exame médico.
     * @param requestBody
     * @returns ExameMedico
     * @throws ApiError
     */
    public static v1ClinicoExamemedicoUpdate(
        id: number,
        requestBody: ExameMedicoRequest,
    ): CancelablePromise<ExameMedico> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/clinico/examemedico/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Gerenciamento de exames médicos (imagem/diagnóstico)
     * @param id Um valor inteiro único que identifica este Exame médico.
     * @param requestBody
     * @returns ExameMedico
     * @throws ApiError
     */
    public static v1ClinicoExamemedicoPartialUpdate(
        id: number,
        requestBody?: PatchedExameMedicoRequest,
    ): CancelablePromise<ExameMedico> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/clinico/examemedico/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Gerenciamento de exames médicos (imagem/diagnóstico)
     * @param id Um valor inteiro único que identifica este Exame médico.
     * @returns void
     * @throws ApiError
     */
    public static v1ClinicoExamemedicoDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/clinico/examemedico/{id}/',
            path: {
                'id': id,
            },
        });
    }
}
