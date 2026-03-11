/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Paciente } from '../models/Paciente';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PacientesService {
    /**
     * Listar pacientes
     * @param search Filtrar por nome ou email
     * @param ordering Campo para ordenação
     * @param limit
     * @param offset
     * @returns any
     * @throws ApiError
     */
    public static clinicoPacientesList(
        search?: string,
        ordering?: string,
        limit?: number,
        offset?: number,
    ): CancelablePromise<{
        results?: Array<Paciente>;
        count?: number;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/clinico/pacientes/',
            query: {
                'search': search,
                'ordering': ordering,
                'limit': limit,
                'offset': offset,
            },
        });
    }
    /**
     * Criar novo paciente
     * @param requestBody
     * @returns Paciente
     * @throws ApiError
     */
    public static clinicoPacientesCreate(
        requestBody: Paciente,
    ): CancelablePromise<Paciente> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/clinico/pacientes/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Obter detalhes de um paciente
     * @param id
     * @returns Paciente
     * @throws ApiError
     */
    public static clinicoPacientesRetrieve(
        id: number,
    ): CancelablePromise<Paciente> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/clinico/pacientes/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Atualizar paciente
     * @param id
     * @param requestBody
     * @returns Paciente
     * @throws ApiError
     */
    public static clinicoPacientesUpdate(
        id: number,
        requestBody: Paciente,
    ): CancelablePromise<Paciente> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/clinico/pacientes/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Atualizar parcialmente um paciente
     * @param id
     * @param requestBody
     * @returns Paciente
     * @throws ApiError
     */
    public static clinicoPacientesPartialUpdate(
        id: number,
        requestBody?: Paciente,
    ): CancelablePromise<Paciente> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/clinico/pacientes/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Deletar um paciente
     * @param id
     * @returns void
     * @throws ApiError
     */
    public static clinicoPacientesDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/clinico/pacientes/{id}/',
            path: {
                'id': id,
            },
        });
    }
}
