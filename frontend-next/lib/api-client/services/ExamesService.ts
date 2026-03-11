/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Exame } from '../models/Exame';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ExamesService {
    /**
     * Listar exames
     * @param search
     * @returns any
     * @throws ApiError
     */
    public static clinicoExamesList(
        search?: string,
    ): CancelablePromise<{
        results?: Array<Exame>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/clinico/exames/',
            query: {
                'search': search,
            },
        });
    }
}
