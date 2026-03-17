/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EstadoResultadoEnum } from './EstadoResultadoEnum';
import type { RequisicaoAnaliseTipoEnum } from './RequisicaoAnaliseTipoEnum';
import type { RequisicaoItemResumo } from './RequisicaoItemResumo';
import type { StatusClinicoEnum } from './StatusClinicoEnum';
/**
 * Serializer para requisições (por setor).
 *
 * - LAB: aceita `exames` (laboratoriais)
 * - MED: aceita `exames_medicos`
 */
export type RequisicaoAnalise = {
    readonly id?: number;
    exames?: Array<number>;
    exames_medicos?: Array<number>;
    readonly paciente_nome?: string;
    readonly paciente_codigo?: string;
    readonly empresa_solicitante_nome?: string;
    readonly empresa_executora_externa_nome?: string;
    readonly itens?: Array<RequisicaoItemResumo>;
    readonly criado_em?: string;
    readonly atualizado_em?: string;
    readonly id_custom?: string | null;
    readonly deletado?: boolean;
    readonly deletado_em?: string | null;
    readonly versao?: number;
    /**
     * Tipo/setor da requisição (LAB ou MED).
     *
     * * `LAB` - Laboratório
     * * `MED` - Exame médico
     */
    tipo?: RequisicaoAnaliseTipoEnum;
    estado?: EstadoResultadoEnum;
    status_clinico?: StatusClinicoEnum;
    readonly possui_resultado_critico?: boolean;
    readonly criado_por?: number | null;
    readonly atualizado_por?: number | null;
    readonly inquilino?: number;
    readonly deletado_por?: number | null;
    /**
     * Paciente para o qual a análise foi requisitada
     */
    paciente: number;
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

