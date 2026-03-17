/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { WorklistExameItem } from './WorklistExameItem';
import type { WorklistPaciente } from './WorklistPaciente';
export type WorklistOrdem = {
    accession: string;
    ordem_id: number;
    estado: string;
    requisicao_id: number;
    requisicao_codigo: string;
    paciente: WorklistPaciente;
    itens: Array<WorklistExameItem>;
    criado_em?: string | null;
};

