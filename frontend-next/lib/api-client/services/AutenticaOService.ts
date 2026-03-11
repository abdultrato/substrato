/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TokenResponse } from '../models/TokenResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AutenticaOService {
    /**
     * Login - Obter tokens JWT
     * @param requestBody
     * @returns TokenResponse
     * @throws ApiError
     */
    public static identidadeTokenCreate(
        requestBody: {
            username: string;
            password: string;
        },
    ): CancelablePromise<TokenResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/identidade/token/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Refresh - Obter novo access token
     * @param requestBody
     * @returns any
     * @throws ApiError
     */
    public static identidadeTokenRefreshCreate(
        requestBody: {
            refresh: string;
        },
    ): CancelablePromise<{
        access?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/identidade/token/refresh/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
