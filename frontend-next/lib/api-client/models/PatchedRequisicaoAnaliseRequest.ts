/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EstadoCfbEnum } from './EstadoCfbEnum';
import type { StatusClinicoEnum } from './StatusClinicoEnum';
/**
 * Serializer para requisições de análise laboratorial.
 * Agrupa múltiplos exames para um paciente.
 */
export type PatchedRequisicaoAnaliseRequest = {
    /**
     * Paciente para o qual a análise foi requisitada
     */
    paciente?: number;
    exames?: Array<number>;
    analista?: number | null;
    estado?: EstadoCfbEnum;
    status_clinico?: StatusClinicoEnum;
};

