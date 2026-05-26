/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UserAudit = {
    readonly id?: number;
    /**
     * Obrigatório. 150 carateres ou menos. Apenas letras, dígitos @/./+/-/_.
     */
    username: string;
    first_name?: string;
    last_name?: string;
    readonly name?: string;
    readonly groups?: string;
    readonly total_activities?: number;
    readonly last_activity_at?: string;
};
