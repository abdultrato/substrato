/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RequisicaoAnalise = {
    readonly id: number;
    paciente: number;
    data_requisicao: string;
    status: 'pendente' | 'processada' | 'completa' | 'cancelada';
    readonly criado_em?: string;
};

