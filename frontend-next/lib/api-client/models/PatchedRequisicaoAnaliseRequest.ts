/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EstadoResultadoEnum } from './EstadoResultadoEnum';
import type { RequisicaoAnaliseTipoEnum } from './RequisicaoAnaliseTipoEnum';
import type { ClinicalStatusEnum } from './ClinicalStatusEnum';
/**
 * Serializer para requisições (por setor).
 *
 * - LAB: aceita `exames` (laboratoriais)
 * - MED: aceita `exames_medicos`
 */
export type PatchedRequisicaoAnaliseRequest = {
    exames?: Array<number>;
    exames_medicos?: Array<number>;
    /**
     * Tipo/setor da requisição (LAB ou MED).
     *
     * * `LAB` - Laboratório
     * * `MED` - Exame médico
     */
    tipo?: RequisicaoAnaliseTipoEnum;
    estado?: EstadoResultadoEnum;
    status_clinico?: ClinicalStatusEnum;
    /**
     * Paciente para o qual a análise foi requisitada
     */
    paciente?: number;
    /**
     * Empresa que subcontrata os serviços (ex.: medicina ocupacional).
     */
    empresa_solicitante?: number | null;
    /**
     * Quando a clínica terceiriza a execução para outra empresa.
     */
    empresa_executora_externa?: number | null;
    analista?: number | null;
};

