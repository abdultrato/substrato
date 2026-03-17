/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CheckinFluxoRequest } from './CheckinFluxoRequest';
import type { CriarFaturaRecepcaoRequest } from './CriarFaturaRecepcaoRequest';
import type { CriarRequisicaoRecepcaoRequest } from './CriarRequisicaoRecepcaoRequest';
import type { PacienteFluxoRequest } from './PacienteFluxoRequest';
import type { RegistrarPagamentoRecepcaoRequest } from './RegistrarPagamentoRecepcaoRequest';
export type FluxoAtendimentoCreateRequest = {
    paciente_id?: number;
    paciente?: PacienteFluxoRequest;
    checkin?: CheckinFluxoRequest;
    requisicao?: CriarRequisicaoRecepcaoRequest;
    faturamento?: CriarFaturaRecepcaoRequest;
    pagamento?: RegistrarPagamentoRecepcaoRequest;
    concluir_checkin?: boolean;
};

