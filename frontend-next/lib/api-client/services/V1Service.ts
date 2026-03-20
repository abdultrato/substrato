/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AgregadoFamiliar } from '../models/AgregadoFamiliar';
import type { AgregadoFamiliarRequest } from '../models/AgregadoFamiliarRequest';
import type { AnalyticsResponse } from '../models/AnalyticsResponse';
import type { AtividadeUsuario } from '../models/AtividadeUsuario';
import type { AutorizacaoProcedimento } from '../models/AutorizacaoProcedimento';
import type { AutorizacaoProcedimentoRequest } from '../models/AutorizacaoProcedimentoRequest';
import type { CamaEnfermaria } from '../models/CamaEnfermaria';
import type { CamaEnfermariaRequest } from '../models/CamaEnfermariaRequest';
import type { Cargo } from '../models/Cargo';
import type { CargoRequest } from '../models/CargoRequest';
import type { CheckinRecepcao } from '../models/CheckinRecepcao';
import type { CheckinRecepcaoRequest } from '../models/CheckinRecepcaoRequest';
import type { Cirurgia } from '../models/Cirurgia';
import type { CirurgiaRequest } from '../models/CirurgiaRequest';
import type { ConciliacaoFinanceira } from '../models/ConciliacaoFinanceira';
import type { ConciliacaoFinanceiraRequest } from '../models/ConciliacaoFinanceiraRequest';
import type { ConfiguracaoInquilino } from '../models/ConfiguracaoInquilino';
import type { ConfiguracaoInquilinoRequest } from '../models/ConfiguracaoInquilinoRequest';
import type { ConsultaMedica } from '../models/ConsultaMedica';
import type { ConsultaMedicaRequest } from '../models/ConsultaMedicaRequest';
import type { Conta } from '../models/Conta';
import type { ContaRequest } from '../models/ContaRequest';
import type { DashboardStats } from '../models/DashboardStats';
import type { Detail } from '../models/Detail';
import type { Dispensa } from '../models/Dispensa';
import type { DispensaRequest } from '../models/DispensaRequest';
import type { Empresa } from '../models/Empresa';
import type { EmpresaRequest } from '../models/EmpresaRequest';
import type { Enfermaria } from '../models/Enfermaria';
import type { EnfermariaDashboardResponse } from '../models/EnfermariaDashboardResponse';
import type { EnfermariaRequest } from '../models/EnfermariaRequest';
import type { ErroSistema } from '../models/ErroSistema';
import type { EspecialidadeConsulta } from '../models/EspecialidadeConsulta';
import type { EspecialidadeConsultaRequest } from '../models/EspecialidadeConsultaRequest';
import type { EvolucaoEnfermagem } from '../models/EvolucaoEnfermagem';
import type { EvolucaoEnfermagemRequest } from '../models/EvolucaoEnfermagemRequest';
import type { Falta } from '../models/Falta';
import type { FaltaRequest } from '../models/FaltaRequest';
import type { Fatura } from '../models/Fatura';
import type { FaturaItem } from '../models/FaturaItem';
import type { FaturaItemRequest } from '../models/FaturaItemRequest';
import type { FaturaRequest } from '../models/FaturaRequest';
import type { FeatureFlagTenant } from '../models/FeatureFlagTenant';
import type { FeatureFlagTenantRequest } from '../models/FeatureFlagTenantRequest';
import type { Feriado } from '../models/Feriado';
import type { FeriadoRequest } from '../models/FeriadoRequest';
import type { Ferias } from '../models/Ferias';
import type { FeriasRequest } from '../models/FeriasRequest';
import type { FluxoAtendimentoCreateRequest } from '../models/FluxoAtendimentoCreateRequest';
import type { FolhaPagamento } from '../models/FolhaPagamento';
import type { FolhaPagamentoRequest } from '../models/FolhaPagamentoRequest';
import type { Funcionario } from '../models/Funcionario';
import type { FuncionarioRequest } from '../models/FuncionarioRequest';
import type { Gestacao } from '../models/Gestacao';
import type { GestacaoRequest } from '../models/GestacaoRequest';
import type { HistoricoFatura } from '../models/HistoricoFatura';
import type { HistoricoFaturaRequest } from '../models/HistoricoFaturaRequest';
import type { HoraExtra } from '../models/HoraExtra';
import type { HoraExtraRequest } from '../models/HoraExtraRequest';
import type { HorarioTrabalho } from '../models/HorarioTrabalho';
import type { HorarioTrabalhoRequest } from '../models/HorarioTrabalhoRequest';
import type { Inquilino } from '../models/Inquilino';
import type { InquilinoRequest } from '../models/InquilinoRequest';
import type { InternamentoEnfermaria } from '../models/InternamentoEnfermaria';
import type { InternamentoEnfermariaRequest } from '../models/InternamentoEnfermariaRequest';
import type { ItemVenda } from '../models/ItemVenda';
import type { ItemVendaRequest } from '../models/ItemVendaRequest';
import type { Lancamento } from '../models/Lancamento';
import type { LancamentoRequest } from '../models/LancamentoRequest';
import type { LogEnvio } from '../models/LogEnvio';
import type { LogEnvioRequest } from '../models/LogEnvioRequest';
import type { Lote } from '../models/Lote';
import type { LoteRequest } from '../models/LoteRequest';
import type { Medico } from '../models/Medico';
import type { Movimento } from '../models/Movimento';
import type { MovimentoEstoque } from '../models/MovimentoEstoque';
import type { MovimentoEstoqueRequest } from '../models/MovimentoEstoqueRequest';
import type { MovimentoRequest } from '../models/MovimentoRequest';
import type { Notificacao } from '../models/Notificacao';
import type { NotificacaoRequest } from '../models/NotificacaoRequest';
import type { Pagamento } from '../models/Pagamento';
import type { PagamentoRequest } from '../models/PagamentoRequest';
import type { PasswordChangeRequest } from '../models/PasswordChangeRequest';
import type { PasswordResetConfirmRequest } from '../models/PasswordResetConfirmRequest';
import type { PasswordResetRequestRequest } from '../models/PasswordResetRequestRequest';
import type { PasswordResetToken } from '../models/PasswordResetToken';
import type { PasswordResetTokenRequest } from '../models/PasswordResetTokenRequest';
import type { PatchedAgregadoFamiliarRequest } from '../models/PatchedAgregadoFamiliarRequest';
import type { PatchedAutorizacaoProcedimentoRequest } from '../models/PatchedAutorizacaoProcedimentoRequest';
import type { PatchedCamaEnfermariaRequest } from '../models/PatchedCamaEnfermariaRequest';
import type { PatchedCargoRequest } from '../models/PatchedCargoRequest';
import type { PatchedCheckinRecepcaoRequest } from '../models/PatchedCheckinRecepcaoRequest';
import type { PatchedCirurgiaRequest } from '../models/PatchedCirurgiaRequest';
import type { PatchedConciliacaoFinanceiraRequest } from '../models/PatchedConciliacaoFinanceiraRequest';
import type { PatchedConfiguracaoInquilinoRequest } from '../models/PatchedConfiguracaoInquilinoRequest';
import type { PatchedConsultaMedicaRequest } from '../models/PatchedConsultaMedicaRequest';
import type { PatchedContaRequest } from '../models/PatchedContaRequest';
import type { PatchedDispensaRequest } from '../models/PatchedDispensaRequest';
import type { PatchedEmpresaRequest } from '../models/PatchedEmpresaRequest';
import type { PatchedEnfermariaRequest } from '../models/PatchedEnfermariaRequest';
import type { PatchedEspecialidadeConsultaRequest } from '../models/PatchedEspecialidadeConsultaRequest';
import type { PatchedEvolucaoEnfermagemRequest } from '../models/PatchedEvolucaoEnfermagemRequest';
import type { PatchedFaltaRequest } from '../models/PatchedFaltaRequest';
import type { PatchedFaturaItemRequest } from '../models/PatchedFaturaItemRequest';
import type { PatchedFaturaRequest } from '../models/PatchedFaturaRequest';
import type { PatchedFeatureFlagTenantRequest } from '../models/PatchedFeatureFlagTenantRequest';
import type { PatchedFeriadoRequest } from '../models/PatchedFeriadoRequest';
import type { PatchedFeriasRequest } from '../models/PatchedFeriasRequest';
import type { PatchedFolhaPagamentoRequest } from '../models/PatchedFolhaPagamentoRequest';
import type { PatchedFuncionarioRequest } from '../models/PatchedFuncionarioRequest';
import type { PatchedGestacaoRequest } from '../models/PatchedGestacaoRequest';
import type { PatchedHistoricoFaturaRequest } from '../models/PatchedHistoricoFaturaRequest';
import type { PatchedHoraExtraRequest } from '../models/PatchedHoraExtraRequest';
import type { PatchedHorarioTrabalhoRequest } from '../models/PatchedHorarioTrabalhoRequest';
import type { PatchedInquilinoRequest } from '../models/PatchedInquilinoRequest';
import type { PatchedInternamentoEnfermariaRequest } from '../models/PatchedInternamentoEnfermariaRequest';
import type { PatchedItemVendaRequest } from '../models/PatchedItemVendaRequest';
import type { PatchedLancamentoRequest } from '../models/PatchedLancamentoRequest';
import type { PatchedLogEnvioRequest } from '../models/PatchedLogEnvioRequest';
import type { PatchedLoteRequest } from '../models/PatchedLoteRequest';
import type { PatchedMovimentoEstoqueRequest } from '../models/PatchedMovimentoEstoqueRequest';
import type { PatchedMovimentoRequest } from '../models/PatchedMovimentoRequest';
import type { PatchedNotificacaoRequest } from '../models/PatchedNotificacaoRequest';
import type { PatchedPagamentoRequest } from '../models/PatchedPagamentoRequest';
import type { PatchedPasswordResetTokenRequest } from '../models/PatchedPasswordResetTokenRequest';
import type { PatchedPerfilProfissionalRequest } from '../models/PatchedPerfilProfissionalRequest';
import type { PatchedPlanoAssinaturaRequest } from '../models/PatchedPlanoAssinaturaRequest';
import type { PatchedPlanoCoberturaRequest } from '../models/PatchedPlanoCoberturaRequest';
import type { PatchedPrescricaoEnfermagemRequest } from '../models/PatchedPrescricaoEnfermagemRequest';
import type { PatchedPrescricaoItemRequest } from '../models/PatchedPrescricaoItemRequest';
import type { PatchedProcedimentoCatalogoMaterialRequest } from '../models/PatchedProcedimentoCatalogoMaterialRequest';
import type { PatchedProcedimentoCatalogoRequest } from '../models/PatchedProcedimentoCatalogoRequest';
import type { PatchedProcedimentoCirurgicoRequest } from '../models/PatchedProcedimentoCirurgicoRequest';
import type { PatchedProcedimentoItemRequest } from '../models/PatchedProcedimentoItemRequest';
import type { PatchedProcedimentoItemValorRequest } from '../models/PatchedProcedimentoItemValorRequest';
import type { PatchedProcedimentoMaterialRequest } from '../models/PatchedProcedimentoMaterialRequest';
import type { PatchedProcedimentoMaterialValorRequest } from '../models/PatchedProcedimentoMaterialValorRequest';
import type { PatchedProcedimentoRequest } from '../models/PatchedProcedimentoRequest';
import type { PatchedProdutoRequest } from '../models/PatchedProdutoRequest';
import type { PatchedReciboRequest } from '../models/PatchedReciboRequest';
import type { PatchedReconciliacaoRequest } from '../models/PatchedReconciliacaoRequest';
import type { PatchedRegistroEnfermagemRequest } from '../models/PatchedRegistroEnfermagemRequest';
import type { PatchedRegistroProntuarioRequest } from '../models/PatchedRegistroProntuarioRequest';
import type { PatchedSeguradoraRequest } from '../models/PatchedSeguradoraRequest';
import type { PatchedSinalVitalEnfermagemRequest } from '../models/PatchedSinalVitalEnfermagemRequest';
import type { PatchedTransacaoRequest } from '../models/PatchedTransacaoRequest';
import type { PatchedUserPatchRequest } from '../models/PatchedUserPatchRequest';
import type { PatchedUsoTenantRequest } from '../models/PatchedUsoTenantRequest';
import type { PatchedUsuarioRequest } from '../models/PatchedUsuarioRequest';
import type { PatchedVendaRequest } from '../models/PatchedVendaRequest';
import type { PerfilProfissional } from '../models/PerfilProfissional';
import type { PerfilProfissionalRequest } from '../models/PerfilProfissionalRequest';
import type { PlanoAssinatura } from '../models/PlanoAssinatura';
import type { PlanoAssinaturaRequest } from '../models/PlanoAssinaturaRequest';
import type { PlanoCobertura } from '../models/PlanoCobertura';
import type { PlanoCoberturaRequest } from '../models/PlanoCoberturaRequest';
import type { PrescricaoEnfermagem } from '../models/PrescricaoEnfermagem';
import type { PrescricaoEnfermagemRequest } from '../models/PrescricaoEnfermagemRequest';
import type { PrescricaoItem } from '../models/PrescricaoItem';
import type { PrescricaoItemRequest } from '../models/PrescricaoItemRequest';
import type { Procedimento } from '../models/Procedimento';
import type { ProcedimentoCatalogo } from '../models/ProcedimentoCatalogo';
import type { ProcedimentoCatalogoMaterial } from '../models/ProcedimentoCatalogoMaterial';
import type { ProcedimentoCatalogoMaterialRequest } from '../models/ProcedimentoCatalogoMaterialRequest';
import type { ProcedimentoCatalogoRequest } from '../models/ProcedimentoCatalogoRequest';
import type { ProcedimentoCirurgico } from '../models/ProcedimentoCirurgico';
import type { ProcedimentoCirurgicoRequest } from '../models/ProcedimentoCirurgicoRequest';
import type { ProcedimentoItem } from '../models/ProcedimentoItem';
import type { ProcedimentoItemRequest } from '../models/ProcedimentoItemRequest';
import type { ProcedimentoItemValor } from '../models/ProcedimentoItemValor';
import type { ProcedimentoItemValorRequest } from '../models/ProcedimentoItemValorRequest';
import type { ProcedimentoMaterial } from '../models/ProcedimentoMaterial';
import type { ProcedimentoMaterialRequest } from '../models/ProcedimentoMaterialRequest';
import type { ProcedimentoMaterialValor } from '../models/ProcedimentoMaterialValor';
import type { ProcedimentoMaterialValorRequest } from '../models/ProcedimentoMaterialValorRequest';
import type { ProcedimentoRequest } from '../models/ProcedimentoRequest';
import type { Produto } from '../models/Produto';
import type { ProdutoRequest } from '../models/ProdutoRequest';
import type { Recibo } from '../models/Recibo';
import type { ReciboRequest } from '../models/ReciboRequest';
import type { Reconciliacao } from '../models/Reconciliacao';
import type { ReconciliacaoRequest } from '../models/ReconciliacaoRequest';
import type { RegistroEnfermagem } from '../models/RegistroEnfermagem';
import type { RegistroEnfermagemRequest } from '../models/RegistroEnfermagemRequest';
import type { RegistroProntuario } from '../models/RegistroProntuario';
import type { RegistroProntuarioRequest } from '../models/RegistroProntuarioRequest';
import type { ResultadosInboxRequestRequest } from '../models/ResultadosInboxRequestRequest';
import type { ResultadosInboxResponse } from '../models/ResultadosInboxResponse';
import type { Seguradora } from '../models/Seguradora';
import type { SeguradoraRequest } from '../models/SeguradoraRequest';
import type { SessionTokenObtainPairRequest } from '../models/SessionTokenObtainPairRequest';
import type { SessionTokenRefresh } from '../models/SessionTokenRefresh';
import type { SessionTokenRefreshRequest } from '../models/SessionTokenRefreshRequest';
import type { SinalVitalEnfermagem } from '../models/SinalVitalEnfermagem';
import type { SinalVitalEnfermagemRequest } from '../models/SinalVitalEnfermagemRequest';
import type { Transacao } from '../models/Transacao';
import type { TransacaoRequest } from '../models/TransacaoRequest';
import type { UserMe } from '../models/UserMe';
import type { UsoTenant } from '../models/UsoTenant';
import type { UsoTenantRequest } from '../models/UsoTenantRequest';
import type { Usuario } from '../models/Usuario';
import type { UsuarioAuditoria } from '../models/UsuarioAuditoria';
import type { UsuarioRequest } from '../models/UsuarioRequest';
import type { Venda } from '../models/Venda';
import type { VendaRequest } from '../models/VendaRequest';
import type { WorklistResponse } from '../models/WorklistResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class V1Service {
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param caminho
     * @param criadoEm
     * @param fim
     * @param inicio
     * @param metodo
     * @param objetoId
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param search Um termo de busca.
     * @param statusCode
     * @param usuario
     * @param viewAction
     * @param viewBasename
     * @returns AtividadeUsuario
     * @throws ApiError
     */
    public static v1AuditoriaAtividadeList(
        caminho?: string,
        criadoEm?: string,
        fim?: string,
        inicio?: string,
        metodo?: string,
        objetoId?: string,
        ordering?: string,
        search?: string,
        statusCode?: number,
        usuario?: number,
        viewAction?: string,
        viewBasename?: string,
    ): CancelablePromise<Array<AtividadeUsuario>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/auditoria/atividade/',
            query: {
                'caminho': caminho,
                'criado_em': criadoEm,
                'fim': fim,
                'inicio': inicio,
                'metodo': metodo,
                'objeto_id': objetoId,
                'ordering': ordering,
                'search': search,
                'status_code': statusCode,
                'usuario': usuario,
                'view_action': viewAction,
                'view_basename': viewBasename,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Actividade do Utilizador.
     * @returns AtividadeUsuario
     * @throws ApiError
     */
    public static v1AuditoriaAtividadeRetrieve(
        id: number,
    ): CancelablePromise<AtividadeUsuario> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/auditoria/atividade/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Lista usuários com contagem e última actividade registrada.
     * @param firstName
     * @param id
     * @param isActive
     * @param lastLogin
     * @param lastName
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param search Um termo de busca.
     * @param username
     * @returns UsuarioAuditoria
     * @throws ApiError
     */
    public static v1AuditoriaUsuariosList(
        firstName?: string,
        id?: number,
        isActive?: boolean,
        lastLogin?: string,
        lastName?: string,
        ordering?: string,
        search?: string,
        username?: string,
    ): CancelablePromise<Array<UsuarioAuditoria>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/auditoria/usuarios/',
            query: {
                'first_name': firstName,
                'id': id,
                'is_active': isActive,
                'last_login': lastLogin,
                'last_name': lastName,
                'ordering': ordering,
                'search': search,
                'username': username,
            },
        });
    }
    /**
     * Lista usuários com contagem e última actividade registrada.
     * @param id Um valor inteiro único que identifica este Usuário.
     * @returns UsuarioAuditoria
     * @throws ApiError
     */
    public static v1AuditoriaUsuariosRetrieve(
        id: number,
    ): CancelablePromise<UsuarioAuditoria> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/auditoria/usuarios/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Takes a set of user credentials and returns an access and refresh JSON web
     * token pair to prove the authentication of those credentials.
     * @param requestBody
     * @returns any No response body
     * @throws ApiError
     */
    public static v1AuthLoginCreate(
        requestBody: SessionTokenObtainPairRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/login/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns void
     * @throws ApiError
     */
    public static v1AuthLogoutCreate(): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/logout/',
        });
    }
    /**
     * @param requestBody
     * @returns void
     * @throws ApiError
     */
    public static v1AuthPasswordResetConfirmCreate(
        requestBody: PasswordResetConfirmRequest,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/password-reset/confirm/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param requestBody
     * @returns Detail
     * @throws ApiError
     */
    public static v1AuthPasswordResetRequestCreate(
        requestBody?: PasswordResetRequestRequest,
    ): CancelablePromise<Detail> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/password-reset/request/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param requestBody
     * @returns void
     * @throws ApiError
     */
    public static v1AuthPasswordChangeCreate(
        requestBody: PasswordChangeRequest,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/password/change/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Takes a refresh type JSON web token and returns an access type JSON web
     * token if the refresh token is valid.
     * @param requestBody
     * @returns SessionTokenRefresh
     * @throws ApiError
     */
    public static v1AuthRefreshCreate(
        requestBody: SessionTokenRefreshRequest,
    ): CancelablePromise<SessionTokenRefresh> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/refresh/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns UserMe
     * @throws ApiError
     */
    public static v1AuthUserRetrieve(): CancelablePromise<UserMe> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/auth/user/',
        });
    }
    /**
     * @param requestBody
     * @returns UserMe
     * @throws ApiError
     */
    public static v1AuthUserPartialUpdate(
        requestBody?: PatchedUserPatchRequest,
    ): CancelablePromise<UserMe> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/auth/user/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param agendadaPara
     * @param cirurgiao
     * @param criadoEm
     * @param estado * `AGENDADA` - Agendada
     * * `EM_ANDAMENTO` - Em andamento
     * * `CONCLUIDA` - Concluída
     * * `CANCELADA` - Cancelada
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param paciente
     * @param search Um termo de busca.
     * @returns Cirurgia
     * @throws ApiError
     */
    public static v1CirurgiaCirurgiaList(
        agendadaPara?: string,
        cirurgiao?: number,
        criadoEm?: string,
        estado?: 'AGENDADA' | 'CANCELADA' | 'CONCLUIDA' | 'EM_ANDAMENTO',
        ordering?: string,
        paciente?: number,
        search?: string,
    ): CancelablePromise<Array<Cirurgia>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/cirurgia/cirurgia/',
            query: {
                'agendada_para': agendadaPara,
                'cirurgiao': cirurgiao,
                'criado_em': criadoEm,
                'estado': estado,
                'ordering': ordering,
                'paciente': paciente,
                'search': search,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns Cirurgia
     * @throws ApiError
     */
    public static v1CirurgiaCirurgiaCreate(
        requestBody: CirurgiaRequest,
    ): CancelablePromise<Cirurgia> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/cirurgia/cirurgia/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Cirurgia.
     * @returns Cirurgia
     * @throws ApiError
     */
    public static v1CirurgiaCirurgiaRetrieve(
        id: number,
    ): CancelablePromise<Cirurgia> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/cirurgia/cirurgia/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Cirurgia.
     * @param requestBody
     * @returns Cirurgia
     * @throws ApiError
     */
    public static v1CirurgiaCirurgiaUpdate(
        id: number,
        requestBody: CirurgiaRequest,
    ): CancelablePromise<Cirurgia> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/cirurgia/cirurgia/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Cirurgia.
     * @param requestBody
     * @returns Cirurgia
     * @throws ApiError
     */
    public static v1CirurgiaCirurgiaPartialUpdate(
        id: number,
        requestBody?: PatchedCirurgiaRequest,
    ): CancelablePromise<Cirurgia> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/cirurgia/cirurgia/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Cirurgia.
     * @returns void
     * @throws ApiError
     */
    public static v1CirurgiaCirurgiaDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/cirurgia/cirurgia/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Cirurgia.
     * @param requestBody
     * @returns Cirurgia
     * @throws ApiError
     */
    public static v1CirurgiaCirurgiaCriarFaturaCreate(
        id: number,
        requestBody: CirurgiaRequest,
    ): CancelablePromise<Cirurgia> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/cirurgia/cirurgia/{id}/criar_fatura/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param ativo
     * @param criadoEm
     * @param nome
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param search Um termo de busca.
     * @returns ProcedimentoCirurgico
     * @throws ApiError
     */
    public static v1CirurgiaProcedimentocirurgicoList(
        ativo?: boolean,
        criadoEm?: string,
        nome?: string,
        ordering?: string,
        search?: string,
    ): CancelablePromise<Array<ProcedimentoCirurgico>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/cirurgia/procedimentocirurgico/',
            query: {
                'ativo': ativo,
                'criado_em': criadoEm,
                'nome': nome,
                'ordering': ordering,
                'search': search,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns ProcedimentoCirurgico
     * @throws ApiError
     */
    public static v1CirurgiaProcedimentocirurgicoCreate(
        requestBody: ProcedimentoCirurgicoRequest,
    ): CancelablePromise<ProcedimentoCirurgico> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/cirurgia/procedimentocirurgico/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Procedimento Cirúrgico.
     * @returns ProcedimentoCirurgico
     * @throws ApiError
     */
    public static v1CirurgiaProcedimentocirurgicoRetrieve(
        id: number,
    ): CancelablePromise<ProcedimentoCirurgico> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/cirurgia/procedimentocirurgico/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Procedimento Cirúrgico.
     * @param requestBody
     * @returns ProcedimentoCirurgico
     * @throws ApiError
     */
    public static v1CirurgiaProcedimentocirurgicoUpdate(
        id: number,
        requestBody: ProcedimentoCirurgicoRequest,
    ): CancelablePromise<ProcedimentoCirurgico> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/cirurgia/procedimentocirurgico/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Procedimento Cirúrgico.
     * @param requestBody
     * @returns ProcedimentoCirurgico
     * @throws ApiError
     */
    public static v1CirurgiaProcedimentocirurgicoPartialUpdate(
        id: number,
        requestBody?: PatchedProcedimentoCirurgicoRequest,
    ): CancelablePromise<ProcedimentoCirurgico> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/cirurgia/procedimentocirurgico/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Procedimento Cirúrgico.
     * @returns void
     * @throws ApiError
     */
    public static v1CirurgiaProcedimentocirurgicoDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/cirurgia/procedimentocirurgico/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param agendadaPara
     * @param criadoEm
     * @param estado * `MARCADA` - Marcada
     * * `CONCLUIDA` - Concluída
     * * `CANCELADA` - Cancelada
     * @param feriadoManual
     * @param medico
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param paciente
     * @param search Um termo de busca.
     * @param tipo
     * @param tipoHorario * `NORMAL` - Normal (08h-18h)
     * * `FORA_EXPEDIENTE` - Fora de expediente (19h-07h)
     * * `FIM_SEMANA` - Fim de semana
     * * `FERIADO_MANUAL` - Feriado (marcado)
     * @returns ConsultaMedica
     * @throws ApiError
     */
    public static v1ConsultasConsultaList(
        agendadaPara?: string,
        criadoEm?: string,
        estado?: 'CANCELADA' | 'CONCLUIDA' | 'MARCADA',
        feriadoManual?: boolean,
        medico?: number,
        ordering?: string,
        paciente?: number,
        search?: string,
        tipo?: string,
        tipoHorario?: 'FERIADO_MANUAL' | 'FIM_SEMANA' | 'FORA_EXPEDIENTE' | 'NORMAL',
    ): CancelablePromise<Array<ConsultaMedica>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/consultas/consulta/',
            query: {
                'agendada_para': agendadaPara,
                'criado_em': criadoEm,
                'estado': estado,
                'feriado_manual': feriadoManual,
                'medico': medico,
                'ordering': ordering,
                'paciente': paciente,
                'search': search,
                'tipo': tipo,
                'tipo_horario': tipoHorario,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns ConsultaMedica
     * @throws ApiError
     */
    public static v1ConsultasConsultaCreate(
        requestBody: ConsultaMedicaRequest,
    ): CancelablePromise<ConsultaMedica> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/consultas/consulta/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Consulta Médica.
     * @returns ConsultaMedica
     * @throws ApiError
     */
    public static v1ConsultasConsultaRetrieve(
        id: number,
    ): CancelablePromise<ConsultaMedica> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/consultas/consulta/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Consulta Médica.
     * @param requestBody
     * @returns ConsultaMedica
     * @throws ApiError
     */
    public static v1ConsultasConsultaUpdate(
        id: number,
        requestBody: ConsultaMedicaRequest,
    ): CancelablePromise<ConsultaMedica> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/consultas/consulta/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Consulta Médica.
     * @param requestBody
     * @returns ConsultaMedica
     * @throws ApiError
     */
    public static v1ConsultasConsultaPartialUpdate(
        id: number,
        requestBody?: PatchedConsultaMedicaRequest,
    ): CancelablePromise<ConsultaMedica> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/consultas/consulta/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Consulta Médica.
     * @returns void
     * @throws ApiError
     */
    public static v1ConsultasConsultaDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/consultas/consulta/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Consulta Médica.
     * @param requestBody
     * @returns ConsultaMedica
     * @throws ApiError
     */
    public static v1ConsultasConsultaCancelarCreate(
        id: number,
        requestBody: ConsultaMedicaRequest,
    ): CancelablePromise<ConsultaMedica> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/consultas/consulta/{id}/cancelar/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Consulta Médica.
     * @param requestBody
     * @returns ConsultaMedica
     * @throws ApiError
     */
    public static v1ConsultasConsultaConcluirCreate(
        id: number,
        requestBody: ConsultaMedicaRequest,
    ): CancelablePromise<ConsultaMedica> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/consultas/consulta/{id}/concluir/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Consulta Médica.
     * @param requestBody
     * @returns ConsultaMedica
     * @throws ApiError
     */
    public static v1ConsultasConsultaCriarFaturaCreate(
        id: number,
        requestBody: ConsultaMedicaRequest,
    ): CancelablePromise<ConsultaMedica> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/consultas/consulta/{id}/criar_fatura/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Consulta Médica.
     * @param requestBody
     * @returns ConsultaMedica
     * @throws ApiError
     */
    public static v1ConsultasConsultaRemarcarCreate(
        id: number,
        requestBody: ConsultaMedicaRequest,
    ): CancelablePromise<ConsultaMedica> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/consultas/consulta/{id}/remarcar/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Lista agenda de consultas por médico e intervalo.
     *
     * Query params:
     * - medico: id do usuário (opcional)
     * - start: datetime ISO (opcional)
     * - end: datetime ISO (opcional)
     * - estado: MARCADA|CONCLUIDA|CANCELADA (opcional)
     * @returns ConsultaMedica
     * @throws ApiError
     */
    public static v1ConsultasConsultaAgendaRetrieve(): CancelablePromise<ConsultaMedica> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/consultas/consulta/agenda/',
        });
    }
    /**
     * Preview de preço (horário, fim de semana, fora de expediente, feriado manual)
     * para uma especialidade + data/hora.
     *
     * Query params:
     * - especialidade: id (obrigatório)
     * - agendada_para: datetime ISO (opcional; default: now)
     * - feriado_manual: bool (opcional; default: False)
     * @returns ConsultaMedica
     * @throws ApiError
     */
    public static v1ConsultasConsultaPrecoRetrieve(): CancelablePromise<ConsultaMedica> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/consultas/consulta/preco/',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param ativo
     * @param nome
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param precoBase
     * @param search Um termo de busca.
     * @returns EspecialidadeConsulta
     * @throws ApiError
     */
    public static v1ConsultasEspecialidadeList(
        ativo?: boolean,
        nome?: string,
        ordering?: string,
        precoBase?: number,
        search?: string,
    ): CancelablePromise<Array<EspecialidadeConsulta>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/consultas/especialidade/',
            query: {
                'ativo': ativo,
                'nome': nome,
                'ordering': ordering,
                'preco_base': precoBase,
                'search': search,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns EspecialidadeConsulta
     * @throws ApiError
     */
    public static v1ConsultasEspecialidadeCreate(
        requestBody: EspecialidadeConsultaRequest,
    ): CancelablePromise<EspecialidadeConsulta> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/consultas/especialidade/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Especialidade (Consulta).
     * @returns EspecialidadeConsulta
     * @throws ApiError
     */
    public static v1ConsultasEspecialidadeRetrieve(
        id: number,
    ): CancelablePromise<EspecialidadeConsulta> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/consultas/especialidade/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Especialidade (Consulta).
     * @param requestBody
     * @returns EspecialidadeConsulta
     * @throws ApiError
     */
    public static v1ConsultasEspecialidadeUpdate(
        id: number,
        requestBody: EspecialidadeConsultaRequest,
    ): CancelablePromise<EspecialidadeConsulta> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/consultas/especialidade/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Especialidade (Consulta).
     * @param requestBody
     * @returns EspecialidadeConsulta
     * @throws ApiError
     */
    public static v1ConsultasEspecialidadePartialUpdate(
        id: number,
        requestBody?: PatchedEspecialidadeConsultaRequest,
    ): CancelablePromise<EspecialidadeConsulta> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/consultas/especialidade/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Especialidade (Consulta).
     * @returns void
     * @throws ApiError
     */
    public static v1ConsultasEspecialidadeDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/consultas/especialidade/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param ativo
     * @param data
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param search Um termo de busca.
     * @returns Feriado
     * @throws ApiError
     */
    public static v1ConsultasFeriadoList(
        ativo?: boolean,
        data?: string,
        ordering?: string,
        search?: string,
    ): CancelablePromise<Array<Feriado>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/consultas/feriado/',
            query: {
                'ativo': ativo,
                'data': data,
                'ordering': ordering,
                'search': search,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns Feriado
     * @throws ApiError
     */
    public static v1ConsultasFeriadoCreate(
        requestBody: FeriadoRequest,
    ): CancelablePromise<Feriado> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/consultas/feriado/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Feriado.
     * @returns Feriado
     * @throws ApiError
     */
    public static v1ConsultasFeriadoRetrieve(
        id: number,
    ): CancelablePromise<Feriado> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/consultas/feriado/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Feriado.
     * @param requestBody
     * @returns Feriado
     * @throws ApiError
     */
    public static v1ConsultasFeriadoUpdate(
        id: number,
        requestBody: FeriadoRequest,
    ): CancelablePromise<Feriado> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/consultas/feriado/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Feriado.
     * @param requestBody
     * @returns Feriado
     * @throws ApiError
     */
    public static v1ConsultasFeriadoPartialUpdate(
        id: number,
        requestBody?: PatchedFeriadoRequest,
    ): CancelablePromise<Feriado> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/consultas/feriado/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Feriado.
     * @returns void
     * @throws ApiError
     */
    public static v1ConsultasFeriadoDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/consultas/feriado/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param cargo
     * @param criadoEm
     * @param estado * `ATIVO` - Ativo
     * * `INATIVO` - Inativo
     * @param nome
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param profissao
     * @param search Um termo de busca.
     * @returns Medico
     * @throws ApiError
     */
    public static v1ConsultasMedicosList(
        cargo?: number,
        criadoEm?: string,
        estado?: 'ATIVO' | 'INATIVO',
        nome?: string,
        ordering?: string,
        profissao?: string,
        search?: string,
    ): CancelablePromise<Array<Medico>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/consultas/medicos/',
            query: {
                'cargo': cargo,
                'criado_em': criadoEm,
                'estado': estado,
                'nome': nome,
                'ordering': ordering,
                'profissao': profissao,
                'search': search,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Funcionário.
     * @returns Medico
     * @throws ApiError
     */
    public static v1ConsultasMedicosRetrieve(
        id: number,
    ): CancelablePromise<Medico> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/consultas/medicos/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param conciliado
     * @param criadoEm
     * @param fatura
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param search Um termo de busca.
     * @returns ConciliacaoFinanceira
     * @throws ApiError
     */
    public static v1ContabilidadeConciliacaofinanceiraList(
        conciliado?: boolean,
        criadoEm?: string,
        fatura?: number,
        ordering?: string,
        search?: string,
    ): CancelablePromise<Array<ConciliacaoFinanceira>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/contabilidade/conciliacaofinanceira/',
            query: {
                'conciliado': conciliado,
                'criado_em': criadoEm,
                'fatura': fatura,
                'ordering': ordering,
                'search': search,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns ConciliacaoFinanceira
     * @throws ApiError
     */
    public static v1ContabilidadeConciliacaofinanceiraCreate(
        requestBody: ConciliacaoFinanceiraRequest,
    ): CancelablePromise<ConciliacaoFinanceira> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/contabilidade/conciliacaofinanceira/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este conciliacao financeira.
     * @returns ConciliacaoFinanceira
     * @throws ApiError
     */
    public static v1ContabilidadeConciliacaofinanceiraRetrieve(
        id: number,
    ): CancelablePromise<ConciliacaoFinanceira> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/contabilidade/conciliacaofinanceira/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este conciliacao financeira.
     * @param requestBody
     * @returns ConciliacaoFinanceira
     * @throws ApiError
     */
    public static v1ContabilidadeConciliacaofinanceiraUpdate(
        id: number,
        requestBody: ConciliacaoFinanceiraRequest,
    ): CancelablePromise<ConciliacaoFinanceira> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/contabilidade/conciliacaofinanceira/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este conciliacao financeira.
     * @param requestBody
     * @returns ConciliacaoFinanceira
     * @throws ApiError
     */
    public static v1ContabilidadeConciliacaofinanceiraPartialUpdate(
        id: number,
        requestBody?: PatchedConciliacaoFinanceiraRequest,
    ): CancelablePromise<ConciliacaoFinanceira> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/contabilidade/conciliacaofinanceira/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este conciliacao financeira.
     * @returns void
     * @throws ApiError
     */
    public static v1ContabilidadeConciliacaofinanceiraDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/contabilidade/conciliacaofinanceira/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param atualizadoEm
     * @param atualizadoPor
     * @param criadoEm
     * @param criadoPor
     * @param deletado
     * @param deletadoEm
     * @param idCustom
     * @param inquilino
     * @param nome
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param search Um termo de busca.
     * @param tipo * `ATI` - Ativo
     * * `PAS` - Passivo
     * * `REC` - Receita
     * * `DES` - Despesa
     * * `PAT` - Patrimônio
     * @returns Conta
     * @throws ApiError
     */
    public static v1ContabilidadeContaList(
        atualizadoEm?: string,
        atualizadoPor?: number,
        criadoEm?: string,
        criadoPor?: number,
        deletado?: boolean,
        deletadoEm?: string,
        idCustom?: string,
        inquilino?: number,
        nome?: string,
        ordering?: string,
        search?: string,
        tipo?: 'ATI' | 'DES' | 'PAS' | 'PAT' | 'REC',
    ): CancelablePromise<Array<Conta>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/contabilidade/conta/',
            query: {
                'atualizado_em': atualizadoEm,
                'atualizado_por': atualizadoPor,
                'criado_em': criadoEm,
                'criado_por': criadoPor,
                'deletado': deletado,
                'deletado_em': deletadoEm,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'nome': nome,
                'ordering': ordering,
                'search': search,
                'tipo': tipo,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns Conta
     * @throws ApiError
     */
    public static v1ContabilidadeContaCreate(
        requestBody: ContaRequest,
    ): CancelablePromise<Conta> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/contabilidade/conta/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este conta.
     * @returns Conta
     * @throws ApiError
     */
    public static v1ContabilidadeContaRetrieve(
        id: number,
    ): CancelablePromise<Conta> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/contabilidade/conta/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este conta.
     * @param requestBody
     * @returns Conta
     * @throws ApiError
     */
    public static v1ContabilidadeContaUpdate(
        id: number,
        requestBody: ContaRequest,
    ): CancelablePromise<Conta> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/contabilidade/conta/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este conta.
     * @param requestBody
     * @returns Conta
     * @throws ApiError
     */
    public static v1ContabilidadeContaPartialUpdate(
        id: number,
        requestBody?: PatchedContaRequest,
    ): CancelablePromise<Conta> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/contabilidade/conta/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este conta.
     * @returns void
     * @throws ApiError
     */
    public static v1ContabilidadeContaDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/contabilidade/conta/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param atualizadoEm
     * @param atualizadoPor
     * @param confirmado
     * @param criadoEm
     * @param criadoPor
     * @param data
     * @param deletado
     * @param deletadoEm
     * @param descricao
     * @param idCustom
     * @param inquilino
     * @param nome
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param referenciaExterna
     * @param search Um termo de busca.
     * @returns Lancamento
     * @throws ApiError
     */
    public static v1ContabilidadeLancamentoList(
        atualizadoEm?: string,
        atualizadoPor?: number,
        confirmado?: boolean,
        criadoEm?: string,
        criadoPor?: number,
        data?: string,
        deletado?: boolean,
        deletadoEm?: string,
        descricao?: string,
        idCustom?: string,
        inquilino?: number,
        nome?: string,
        ordering?: string,
        referenciaExterna?: string,
        search?: string,
    ): CancelablePromise<Array<Lancamento>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/contabilidade/lancamento/',
            query: {
                'atualizado_em': atualizadoEm,
                'atualizado_por': atualizadoPor,
                'confirmado': confirmado,
                'criado_em': criadoEm,
                'criado_por': criadoPor,
                'data': data,
                'deletado': deletado,
                'deletado_em': deletadoEm,
                'descricao': descricao,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'nome': nome,
                'ordering': ordering,
                'referencia_externa': referenciaExterna,
                'search': search,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns Lancamento
     * @throws ApiError
     */
    public static v1ContabilidadeLancamentoCreate(
        requestBody: LancamentoRequest,
    ): CancelablePromise<Lancamento> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/contabilidade/lancamento/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este lancamento.
     * @returns Lancamento
     * @throws ApiError
     */
    public static v1ContabilidadeLancamentoRetrieve(
        id: number,
    ): CancelablePromise<Lancamento> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/contabilidade/lancamento/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este lancamento.
     * @param requestBody
     * @returns Lancamento
     * @throws ApiError
     */
    public static v1ContabilidadeLancamentoUpdate(
        id: number,
        requestBody: LancamentoRequest,
    ): CancelablePromise<Lancamento> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/contabilidade/lancamento/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este lancamento.
     * @param requestBody
     * @returns Lancamento
     * @throws ApiError
     */
    public static v1ContabilidadeLancamentoPartialUpdate(
        id: number,
        requestBody?: PatchedLancamentoRequest,
    ): CancelablePromise<Lancamento> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/contabilidade/lancamento/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este lancamento.
     * @returns void
     * @throws ApiError
     */
    public static v1ContabilidadeLancamentoDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/contabilidade/lancamento/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param atualizadoEm
     * @param atualizadoPor
     * @param conta
     * @param credito
     * @param criadoEm
     * @param criadoPor
     * @param debito
     * @param deletado
     * @param deletadoEm
     * @param idCustom
     * @param inquilino
     * @param lancamento
     * @param nome
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param search Um termo de busca.
     * @returns Movimento
     * @throws ApiError
     */
    public static v1ContabilidadeMovimentoList(
        atualizadoEm?: string,
        atualizadoPor?: number,
        conta?: number,
        credito?: number,
        criadoEm?: string,
        criadoPor?: number,
        debito?: number,
        deletado?: boolean,
        deletadoEm?: string,
        idCustom?: string,
        inquilino?: number,
        lancamento?: number,
        nome?: string,
        ordering?: string,
        search?: string,
    ): CancelablePromise<Array<Movimento>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/contabilidade/movimento/',
            query: {
                'atualizado_em': atualizadoEm,
                'atualizado_por': atualizadoPor,
                'conta': conta,
                'credito': credito,
                'criado_em': criadoEm,
                'criado_por': criadoPor,
                'debito': debito,
                'deletado': deletado,
                'deletado_em': deletadoEm,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'lancamento': lancamento,
                'nome': nome,
                'ordering': ordering,
                'search': search,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns Movimento
     * @throws ApiError
     */
    public static v1ContabilidadeMovimentoCreate(
        requestBody: MovimentoRequest,
    ): CancelablePromise<Movimento> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/contabilidade/movimento/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este movimento.
     * @returns Movimento
     * @throws ApiError
     */
    public static v1ContabilidadeMovimentoRetrieve(
        id: number,
    ): CancelablePromise<Movimento> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/contabilidade/movimento/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este movimento.
     * @param requestBody
     * @returns Movimento
     * @throws ApiError
     */
    public static v1ContabilidadeMovimentoUpdate(
        id: number,
        requestBody: MovimentoRequest,
    ): CancelablePromise<Movimento> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/contabilidade/movimento/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este movimento.
     * @param requestBody
     * @returns Movimento
     * @throws ApiError
     */
    public static v1ContabilidadeMovimentoPartialUpdate(
        id: number,
        requestBody?: PatchedMovimentoRequest,
    ): CancelablePromise<Movimento> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/contabilidade/movimento/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este movimento.
     * @returns void
     * @throws ApiError
     */
    public static v1ContabilidadeMovimentoDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/contabilidade/movimento/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Painel de estatísticas (Top N) para o Administrador/Contabilidade.
     * @param dias Janela em dias (fallback)
     * @param fim Data/hora final
     * @param inicio Data/hora inicial
     * @param limit Limite (1-50)
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param search Um termo de busca.
     * @returns AnalyticsResponse
     * @throws ApiError
     */
    public static v1DashboardAnalyticsList(
        dias?: number,
        fim?: string,
        inicio?: string,
        limit?: number,
        ordering?: string,
        search?: string,
    ): CancelablePromise<Array<AnalyticsResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/dashboard/analytics/',
            query: {
                'dias': dias,
                'fim': fim,
                'inicio': inicio,
                'limit': limit,
                'ordering': ordering,
                'search': search,
            },
        });
    }
    /**
     * Exporta o relatório do endpoint /dashboard/analytics/ em:
     * - PDF (tipo=pdf)
     * - CSV (tipo=csv)
     * - Word (tipo=word)
     *
     * Nota: evitamos o query-param `format` porque o DRF usa esse nome
     * para content negotiation e pode responder 404 quando não existe
     * renderer para o formato solicitado.
     * @returns AnalyticsResponse
     * @throws ApiError
     */
    public static v1DashboardAnalyticsExportRetrieve(): CancelablePromise<AnalyticsResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/dashboard/analytics/export/',
        });
    }
    /**
     * @returns DashboardStats
     * @throws ApiError
     */
    public static v1DashboardStatsRetrieve(): CancelablePromise<DashboardStats> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/dashboard/stats/',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param ativa
     * @param atualizadoEm
     * @param criadoEm
     * @param deletado
     * @param enfermaria
     * @param idCustom
     * @param inquilino
     * @param numero
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param search Um termo de busca.
     * @returns CamaEnfermaria
     * @throws ApiError
     */
    public static v1EnfermagemCamaenfermariaList(
        ativa?: boolean,
        atualizadoEm?: string,
        criadoEm?: string,
        deletado?: boolean,
        enfermaria?: number,
        idCustom?: string,
        inquilino?: number,
        numero?: string,
        ordering?: string,
        search?: string,
    ): CancelablePromise<Array<CamaEnfermaria>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/enfermagem/camaenfermaria/',
            query: {
                'ativa': ativa,
                'atualizado_em': atualizadoEm,
                'criado_em': criadoEm,
                'deletado': deletado,
                'enfermaria': enfermaria,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'numero': numero,
                'ordering': ordering,
                'search': search,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns CamaEnfermaria
     * @throws ApiError
     */
    public static v1EnfermagemCamaenfermariaCreate(
        requestBody: CamaEnfermariaRequest,
    ): CancelablePromise<CamaEnfermaria> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/enfermagem/camaenfermaria/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Cama.
     * @returns CamaEnfermaria
     * @throws ApiError
     */
    public static v1EnfermagemCamaenfermariaRetrieve(
        id: number,
    ): CancelablePromise<CamaEnfermaria> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/enfermagem/camaenfermaria/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Cama.
     * @param requestBody
     * @returns CamaEnfermaria
     * @throws ApiError
     */
    public static v1EnfermagemCamaenfermariaUpdate(
        id: number,
        requestBody: CamaEnfermariaRequest,
    ): CancelablePromise<CamaEnfermaria> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/enfermagem/camaenfermaria/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Cama.
     * @param requestBody
     * @returns CamaEnfermaria
     * @throws ApiError
     */
    public static v1EnfermagemCamaenfermariaPartialUpdate(
        id: number,
        requestBody?: PatchedCamaEnfermariaRequest,
    ): CancelablePromise<CamaEnfermaria> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/enfermagem/camaenfermaria/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Cama.
     * @returns void
     * @throws ApiError
     */
    public static v1EnfermagemCamaenfermariaDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/enfermagem/camaenfermaria/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param ativa
     * @param atualizadoEm
     * @param criadoEm
     * @param deletado
     * @param idCustom
     * @param inquilino
     * @param nome
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param search Um termo de busca.
     * @returns Enfermaria
     * @throws ApiError
     */
    public static v1EnfermagemEnfermariaList(
        ativa?: boolean,
        atualizadoEm?: string,
        criadoEm?: string,
        deletado?: boolean,
        idCustom?: string,
        inquilino?: number,
        nome?: string,
        ordering?: string,
        search?: string,
    ): CancelablePromise<Array<Enfermaria>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/enfermagem/enfermaria/',
            query: {
                'ativa': ativa,
                'atualizado_em': atualizadoEm,
                'criado_em': criadoEm,
                'deletado': deletado,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'nome': nome,
                'ordering': ordering,
                'search': search,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns Enfermaria
     * @throws ApiError
     */
    public static v1EnfermagemEnfermariaCreate(
        requestBody: EnfermariaRequest,
    ): CancelablePromise<Enfermaria> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/enfermagem/enfermaria/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Enfermaria.
     * @returns Enfermaria
     * @throws ApiError
     */
    public static v1EnfermagemEnfermariaRetrieve(
        id: number,
    ): CancelablePromise<Enfermaria> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/enfermagem/enfermaria/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Enfermaria.
     * @param requestBody
     * @returns Enfermaria
     * @throws ApiError
     */
    public static v1EnfermagemEnfermariaUpdate(
        id: number,
        requestBody: EnfermariaRequest,
    ): CancelablePromise<Enfermaria> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/enfermagem/enfermaria/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Enfermaria.
     * @param requestBody
     * @returns Enfermaria
     * @throws ApiError
     */
    public static v1EnfermagemEnfermariaPartialUpdate(
        id: number,
        requestBody?: PatchedEnfermariaRequest,
    ): CancelablePromise<Enfermaria> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/enfermagem/enfermaria/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Enfermaria.
     * @returns void
     * @throws ApiError
     */
    public static v1EnfermagemEnfermariaDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/enfermagem/enfermaria/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Dashboard operacional da Enfermaria (ocupação + próximas medicações).
     * @returns EnfermariaDashboardResponse
     * @throws ApiError
     */
    public static v1EnfermagemEnfermariadashboardList(): CancelablePromise<Array<EnfermariaDashboardResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/enfermagem/enfermariadashboard/',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param atualizadoEm
     * @param criadoEm
     * @param dataEvolucao
     * @param deletado
     * @param idCustom
     * @param inquilino
     * @param nome
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param paciente
     * @param search Um termo de busca.
     * @returns EvolucaoEnfermagem
     * @throws ApiError
     */
    public static v1EnfermagemEvolucaoenfermagemList(
        atualizadoEm?: string,
        criadoEm?: string,
        dataEvolucao?: string,
        deletado?: boolean,
        idCustom?: string,
        inquilino?: number,
        nome?: string,
        ordering?: string,
        paciente?: number,
        search?: string,
    ): CancelablePromise<Array<EvolucaoEnfermagem>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/enfermagem/evolucaoenfermagem/',
            query: {
                'atualizado_em': atualizadoEm,
                'criado_em': criadoEm,
                'data_evolucao': dataEvolucao,
                'deletado': deletado,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'nome': nome,
                'ordering': ordering,
                'paciente': paciente,
                'search': search,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns EvolucaoEnfermagem
     * @throws ApiError
     */
    public static v1EnfermagemEvolucaoenfermagemCreate(
        requestBody: EvolucaoEnfermagemRequest,
    ): CancelablePromise<EvolucaoEnfermagem> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/enfermagem/evolucaoenfermagem/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Evolução de Enfermagem.
     * @returns EvolucaoEnfermagem
     * @throws ApiError
     */
    public static v1EnfermagemEvolucaoenfermagemRetrieve(
        id: number,
    ): CancelablePromise<EvolucaoEnfermagem> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/enfermagem/evolucaoenfermagem/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Evolução de Enfermagem.
     * @param requestBody
     * @returns EvolucaoEnfermagem
     * @throws ApiError
     */
    public static v1EnfermagemEvolucaoenfermagemUpdate(
        id: number,
        requestBody: EvolucaoEnfermagemRequest,
    ): CancelablePromise<EvolucaoEnfermagem> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/enfermagem/evolucaoenfermagem/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Evolução de Enfermagem.
     * @param requestBody
     * @returns EvolucaoEnfermagem
     * @throws ApiError
     */
    public static v1EnfermagemEvolucaoenfermagemPartialUpdate(
        id: number,
        requestBody?: PatchedEvolucaoEnfermagemRequest,
    ): CancelablePromise<EvolucaoEnfermagem> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/enfermagem/evolucaoenfermagem/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Evolução de Enfermagem.
     * @returns void
     * @throws ApiError
     */
    public static v1EnfermagemEvolucaoenfermagemDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/enfermagem/evolucaoenfermagem/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param altaEm
     * @param ativo
     * @param atualizadoEm
     * @param cama
     * @param criadoEm
     * @param dataInternamento
     * @param dataPrevistaAlta
     * @param deletado
     * @param idCustom
     * @param inquilino
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param paciente
     * @param proximaMedicacaoEm
     * @param search Um termo de busca.
     * @returns InternamentoEnfermaria
     * @throws ApiError
     */
    public static v1EnfermagemInternamentoenfermariaList(
        altaEm?: string,
        ativo?: boolean,
        atualizadoEm?: string,
        cama?: number,
        criadoEm?: string,
        dataInternamento?: string,
        dataPrevistaAlta?: string,
        deletado?: boolean,
        idCustom?: string,
        inquilino?: number,
        ordering?: string,
        paciente?: number,
        proximaMedicacaoEm?: string,
        search?: string,
    ): CancelablePromise<Array<InternamentoEnfermaria>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/enfermagem/internamentoenfermaria/',
            query: {
                'alta_em': altaEm,
                'ativo': ativo,
                'atualizado_em': atualizadoEm,
                'cama': cama,
                'criado_em': criadoEm,
                'data_internamento': dataInternamento,
                'data_prevista_alta': dataPrevistaAlta,
                'deletado': deletado,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'ordering': ordering,
                'paciente': paciente,
                'proxima_medicacao_em': proximaMedicacaoEm,
                'search': search,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns InternamentoEnfermaria
     * @throws ApiError
     */
    public static v1EnfermagemInternamentoenfermariaCreate(
        requestBody: InternamentoEnfermariaRequest,
    ): CancelablePromise<InternamentoEnfermaria> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/enfermagem/internamentoenfermaria/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Internamento (Enfermaria).
     * @returns InternamentoEnfermaria
     * @throws ApiError
     */
    public static v1EnfermagemInternamentoenfermariaRetrieve(
        id: number,
    ): CancelablePromise<InternamentoEnfermaria> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/enfermagem/internamentoenfermaria/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Internamento (Enfermaria).
     * @param requestBody
     * @returns InternamentoEnfermaria
     * @throws ApiError
     */
    public static v1EnfermagemInternamentoenfermariaUpdate(
        id: number,
        requestBody: InternamentoEnfermariaRequest,
    ): CancelablePromise<InternamentoEnfermaria> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/enfermagem/internamentoenfermaria/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Internamento (Enfermaria).
     * @param requestBody
     * @returns InternamentoEnfermaria
     * @throws ApiError
     */
    public static v1EnfermagemInternamentoenfermariaPartialUpdate(
        id: number,
        requestBody?: PatchedInternamentoEnfermariaRequest,
    ): CancelablePromise<InternamentoEnfermaria> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/enfermagem/internamentoenfermaria/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Internamento (Enfermaria).
     * @returns void
     * @throws ApiError
     */
    public static v1EnfermagemInternamentoenfermariaDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/enfermagem/internamentoenfermaria/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param ativo
     * @param atualizadoEm
     * @param criadoEm
     * @param dataPrescricao
     * @param deletado
     * @param idCustom
     * @param inquilino
     * @param nome
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param paciente
     * @param search Um termo de busca.
     * @returns PrescricaoEnfermagem
     * @throws ApiError
     */
    public static v1EnfermagemPrescricaoenfermagemList(
        ativo?: boolean,
        atualizadoEm?: string,
        criadoEm?: string,
        dataPrescricao?: string,
        deletado?: boolean,
        idCustom?: string,
        inquilino?: number,
        nome?: string,
        ordering?: string,
        paciente?: number,
        search?: string,
    ): CancelablePromise<Array<PrescricaoEnfermagem>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/enfermagem/prescricaoenfermagem/',
            query: {
                'ativo': ativo,
                'atualizado_em': atualizadoEm,
                'criado_em': criadoEm,
                'data_prescricao': dataPrescricao,
                'deletado': deletado,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'nome': nome,
                'ordering': ordering,
                'paciente': paciente,
                'search': search,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns PrescricaoEnfermagem
     * @throws ApiError
     */
    public static v1EnfermagemPrescricaoenfermagemCreate(
        requestBody: PrescricaoEnfermagemRequest,
    ): CancelablePromise<PrescricaoEnfermagem> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/enfermagem/prescricaoenfermagem/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Prescrição de Enfermagem.
     * @returns PrescricaoEnfermagem
     * @throws ApiError
     */
    public static v1EnfermagemPrescricaoenfermagemRetrieve(
        id: number,
    ): CancelablePromise<PrescricaoEnfermagem> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/enfermagem/prescricaoenfermagem/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Prescrição de Enfermagem.
     * @param requestBody
     * @returns PrescricaoEnfermagem
     * @throws ApiError
     */
    public static v1EnfermagemPrescricaoenfermagemUpdate(
        id: number,
        requestBody: PrescricaoEnfermagemRequest,
    ): CancelablePromise<PrescricaoEnfermagem> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/enfermagem/prescricaoenfermagem/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Prescrição de Enfermagem.
     * @param requestBody
     * @returns PrescricaoEnfermagem
     * @throws ApiError
     */
    public static v1EnfermagemPrescricaoenfermagemPartialUpdate(
        id: number,
        requestBody?: PatchedPrescricaoEnfermagemRequest,
    ): CancelablePromise<PrescricaoEnfermagem> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/enfermagem/prescricaoenfermagem/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Prescrição de Enfermagem.
     * @returns void
     * @throws ApiError
     */
    public static v1EnfermagemPrescricaoenfermagemDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/enfermagem/prescricaoenfermagem/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param atualizadoEm
     * @param criadoEm
     * @param dataRealizacao
     * @param deletado
     * @param idCustom
     * @param inquilino
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param paciente
     * @param profissional
     * @param search Um termo de busca.
     * @returns Procedimento
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentoList(
        atualizadoEm?: string,
        criadoEm?: string,
        dataRealizacao?: string,
        deletado?: boolean,
        idCustom?: string,
        inquilino?: number,
        ordering?: string,
        paciente?: number,
        profissional?: number,
        search?: string,
    ): CancelablePromise<Array<Procedimento>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/enfermagem/procedimento/',
            query: {
                'atualizado_em': atualizadoEm,
                'criado_em': criadoEm,
                'data_realizacao': dataRealizacao,
                'deletado': deletado,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'ordering': ordering,
                'paciente': paciente,
                'profissional': profissional,
                'search': search,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns Procedimento
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentoCreate(
        requestBody: ProcedimentoRequest,
    ): CancelablePromise<Procedimento> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/enfermagem/procedimento/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Procedimento.
     * @returns Procedimento
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentoRetrieve(
        id: number,
    ): CancelablePromise<Procedimento> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/enfermagem/procedimento/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Procedimento.
     * @param requestBody
     * @returns Procedimento
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentoUpdate(
        id: number,
        requestBody: ProcedimentoRequest,
    ): CancelablePromise<Procedimento> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/enfermagem/procedimento/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Procedimento.
     * @param requestBody
     * @returns Procedimento
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentoPartialUpdate(
        id: number,
        requestBody?: PatchedProcedimentoRequest,
    ): CancelablePromise<Procedimento> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/enfermagem/procedimento/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Procedimento.
     * @returns void
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentoDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/enfermagem/procedimento/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param atualizadoEm
     * @param criadoEm
     * @param deletado
     * @param idCustom
     * @param inquilino
     * @param nome
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param precoPadrao
     * @param search Um termo de busca.
     * @returns ProcedimentoCatalogo
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentocatalogoList(
        atualizadoEm?: string,
        criadoEm?: string,
        deletado?: boolean,
        idCustom?: string,
        inquilino?: number,
        nome?: string,
        ordering?: string,
        precoPadrao?: number,
        search?: string,
    ): CancelablePromise<Array<ProcedimentoCatalogo>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/enfermagem/procedimentocatalogo/',
            query: {
                'atualizado_em': atualizadoEm,
                'criado_em': criadoEm,
                'deletado': deletado,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'nome': nome,
                'ordering': ordering,
                'preco_padrao': precoPadrao,
                'search': search,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns ProcedimentoCatalogo
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentocatalogoCreate(
        requestBody: ProcedimentoCatalogoRequest,
    ): CancelablePromise<ProcedimentoCatalogo> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/enfermagem/procedimentocatalogo/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Procedimento (Catálogo).
     * @returns ProcedimentoCatalogo
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentocatalogoRetrieve(
        id: number,
    ): CancelablePromise<ProcedimentoCatalogo> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/enfermagem/procedimentocatalogo/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Procedimento (Catálogo).
     * @param requestBody
     * @returns ProcedimentoCatalogo
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentocatalogoUpdate(
        id: number,
        requestBody: ProcedimentoCatalogoRequest,
    ): CancelablePromise<ProcedimentoCatalogo> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/enfermagem/procedimentocatalogo/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Procedimento (Catálogo).
     * @param requestBody
     * @returns ProcedimentoCatalogo
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentocatalogoPartialUpdate(
        id: number,
        requestBody?: PatchedProcedimentoCatalogoRequest,
    ): CancelablePromise<ProcedimentoCatalogo> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/enfermagem/procedimentocatalogo/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Procedimento (Catálogo).
     * @returns void
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentocatalogoDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/enfermagem/procedimentocatalogo/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param atualizadoEm
     * @param catalogo
     * @param criadoEm
     * @param custoUnitarioPadrao
     * @param deletado
     * @param idCustom
     * @param inquilino
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param produto
     * @param quantidadePadrao
     * @param search Um termo de busca.
     * @returns ProcedimentoCatalogoMaterial
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentocatalogomaterialList(
        atualizadoEm?: string,
        catalogo?: number,
        criadoEm?: string,
        custoUnitarioPadrao?: number,
        deletado?: boolean,
        idCustom?: string,
        inquilino?: number,
        ordering?: string,
        produto?: number,
        quantidadePadrao?: number,
        search?: string,
    ): CancelablePromise<Array<ProcedimentoCatalogoMaterial>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/enfermagem/procedimentocatalogomaterial/',
            query: {
                'atualizado_em': atualizadoEm,
                'catalogo': catalogo,
                'criado_em': criadoEm,
                'custo_unitario_padrao': custoUnitarioPadrao,
                'deletado': deletado,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'ordering': ordering,
                'produto': produto,
                'quantidade_padrao': quantidadePadrao,
                'search': search,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns ProcedimentoCatalogoMaterial
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentocatalogomaterialCreate(
        requestBody: ProcedimentoCatalogoMaterialRequest,
    ): CancelablePromise<ProcedimentoCatalogoMaterial> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/enfermagem/procedimentocatalogomaterial/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Material de Procedimento.
     * @returns ProcedimentoCatalogoMaterial
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentocatalogomaterialRetrieve(
        id: number,
    ): CancelablePromise<ProcedimentoCatalogoMaterial> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/enfermagem/procedimentocatalogomaterial/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Material de Procedimento.
     * @param requestBody
     * @returns ProcedimentoCatalogoMaterial
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentocatalogomaterialUpdate(
        id: number,
        requestBody: ProcedimentoCatalogoMaterialRequest,
    ): CancelablePromise<ProcedimentoCatalogoMaterial> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/enfermagem/procedimentocatalogomaterial/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Material de Procedimento.
     * @param requestBody
     * @returns ProcedimentoCatalogoMaterial
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentocatalogomaterialPartialUpdate(
        id: number,
        requestBody?: PatchedProcedimentoCatalogoMaterialRequest,
    ): CancelablePromise<ProcedimentoCatalogoMaterial> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/enfermagem/procedimentocatalogomaterial/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Material de Procedimento.
     * @returns void
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentocatalogomaterialDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/enfermagem/procedimentocatalogomaterial/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param atualizadoEm
     * @param catalogo
     * @param criadoEm
     * @param deletado
     * @param descricao
     * @param idCustom
     * @param inquilino
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param procedimento
     * @param quantidade
     * @param realizado
     * @param search Um termo de busca.
     * @returns ProcedimentoItem
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentoitemList(
        atualizadoEm?: string,
        catalogo?: number,
        criadoEm?: string,
        deletado?: boolean,
        descricao?: string,
        idCustom?: string,
        inquilino?: number,
        ordering?: string,
        procedimento?: number,
        quantidade?: number,
        realizado?: boolean,
        search?: string,
    ): CancelablePromise<Array<ProcedimentoItem>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/enfermagem/procedimentoitem/',
            query: {
                'atualizado_em': atualizadoEm,
                'catalogo': catalogo,
                'criado_em': criadoEm,
                'deletado': deletado,
                'descricao': descricao,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'ordering': ordering,
                'procedimento': procedimento,
                'quantidade': quantidade,
                'realizado': realizado,
                'search': search,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns ProcedimentoItem
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentoitemCreate(
        requestBody: ProcedimentoItemRequest,
    ): CancelablePromise<ProcedimentoItem> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/enfermagem/procedimentoitem/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Item de Procedimento.
     * @returns ProcedimentoItem
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentoitemRetrieve(
        id: number,
    ): CancelablePromise<ProcedimentoItem> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/enfermagem/procedimentoitem/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Item de Procedimento.
     * @param requestBody
     * @returns ProcedimentoItem
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentoitemUpdate(
        id: number,
        requestBody: ProcedimentoItemRequest,
    ): CancelablePromise<ProcedimentoItem> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/enfermagem/procedimentoitem/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Item de Procedimento.
     * @param requestBody
     * @returns ProcedimentoItem
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentoitemPartialUpdate(
        id: number,
        requestBody?: PatchedProcedimentoItemRequest,
    ): CancelablePromise<ProcedimentoItem> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/enfermagem/procedimentoitem/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Item de Procedimento.
     * @returns void
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentoitemDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/enfermagem/procedimentoitem/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param atualizadoEm
     * @param criadoEm
     * @param deletado
     * @param idCustom
     * @param inquilino
     * @param item
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param precoUnitario
     * @param search Um termo de busca.
     * @returns ProcedimentoItemValor
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentoitemvalorList(
        atualizadoEm?: string,
        criadoEm?: string,
        deletado?: boolean,
        idCustom?: string,
        inquilino?: number,
        item?: number,
        ordering?: string,
        precoUnitario?: number,
        search?: string,
    ): CancelablePromise<Array<ProcedimentoItemValor>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/enfermagem/procedimentoitemvalor/',
            query: {
                'atualizado_em': atualizadoEm,
                'criado_em': criadoEm,
                'deletado': deletado,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'item': item,
                'ordering': ordering,
                'preco_unitario': precoUnitario,
                'search': search,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns ProcedimentoItemValor
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentoitemvalorCreate(
        requestBody: ProcedimentoItemValorRequest,
    ): CancelablePromise<ProcedimentoItemValor> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/enfermagem/procedimentoitemvalor/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Valor do Item de Procedimento.
     * @returns ProcedimentoItemValor
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentoitemvalorRetrieve(
        id: number,
    ): CancelablePromise<ProcedimentoItemValor> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/enfermagem/procedimentoitemvalor/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Valor do Item de Procedimento.
     * @param requestBody
     * @returns ProcedimentoItemValor
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentoitemvalorUpdate(
        id: number,
        requestBody: ProcedimentoItemValorRequest,
    ): CancelablePromise<ProcedimentoItemValor> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/enfermagem/procedimentoitemvalor/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Valor do Item de Procedimento.
     * @param requestBody
     * @returns ProcedimentoItemValor
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentoitemvalorPartialUpdate(
        id: number,
        requestBody?: PatchedProcedimentoItemValorRequest,
    ): CancelablePromise<ProcedimentoItemValor> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/enfermagem/procedimentoitemvalor/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Valor do Item de Procedimento.
     * @returns void
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentoitemvalorDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/enfermagem/procedimentoitemvalor/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param atualizadoEm
     * @param criadoEm
     * @param deletado
     * @param idCustom
     * @param inquilino
     * @param lote
     * @param movimentoEstoque
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param procedimento
     * @param procedimentoItem
     * @param produto
     * @param quantidade
     * @param search Um termo de busca.
     * @returns ProcedimentoMaterial
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentomaterialList(
        atualizadoEm?: string,
        criadoEm?: string,
        deletado?: boolean,
        idCustom?: string,
        inquilino?: number,
        lote?: number,
        movimentoEstoque?: number,
        ordering?: string,
        procedimento?: number,
        procedimentoItem?: number,
        produto?: number,
        quantidade?: number,
        search?: string,
    ): CancelablePromise<Array<ProcedimentoMaterial>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/enfermagem/procedimentomaterial/',
            query: {
                'atualizado_em': atualizadoEm,
                'criado_em': criadoEm,
                'deletado': deletado,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'lote': lote,
                'movimento_estoque': movimentoEstoque,
                'ordering': ordering,
                'procedimento': procedimento,
                'procedimento_item': procedimentoItem,
                'produto': produto,
                'quantidade': quantidade,
                'search': search,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns ProcedimentoMaterial
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentomaterialCreate(
        requestBody: ProcedimentoMaterialRequest,
    ): CancelablePromise<ProcedimentoMaterial> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/enfermagem/procedimentomaterial/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Material do Procedimento.
     * @returns ProcedimentoMaterial
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentomaterialRetrieve(
        id: number,
    ): CancelablePromise<ProcedimentoMaterial> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/enfermagem/procedimentomaterial/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Material do Procedimento.
     * @param requestBody
     * @returns ProcedimentoMaterial
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentomaterialUpdate(
        id: number,
        requestBody: ProcedimentoMaterialRequest,
    ): CancelablePromise<ProcedimentoMaterial> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/enfermagem/procedimentomaterial/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Material do Procedimento.
     * @param requestBody
     * @returns ProcedimentoMaterial
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentomaterialPartialUpdate(
        id: number,
        requestBody?: PatchedProcedimentoMaterialRequest,
    ): CancelablePromise<ProcedimentoMaterial> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/enfermagem/procedimentomaterial/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Material do Procedimento.
     * @returns void
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentomaterialDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/enfermagem/procedimentomaterial/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param atualizadoEm
     * @param criadoEm
     * @param custoUnitario
     * @param deletado
     * @param idCustom
     * @param inquilino
     * @param material
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param search Um termo de busca.
     * @returns ProcedimentoMaterialValor
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentomaterialvalorList(
        atualizadoEm?: string,
        criadoEm?: string,
        custoUnitario?: number,
        deletado?: boolean,
        idCustom?: string,
        inquilino?: number,
        material?: number,
        ordering?: string,
        search?: string,
    ): CancelablePromise<Array<ProcedimentoMaterialValor>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/enfermagem/procedimentomaterialvalor/',
            query: {
                'atualizado_em': atualizadoEm,
                'criado_em': criadoEm,
                'custo_unitario': custoUnitario,
                'deletado': deletado,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'material': material,
                'ordering': ordering,
                'search': search,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns ProcedimentoMaterialValor
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentomaterialvalorCreate(
        requestBody: ProcedimentoMaterialValorRequest,
    ): CancelablePromise<ProcedimentoMaterialValor> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/enfermagem/procedimentomaterialvalor/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Valor do Material do Procedimento.
     * @returns ProcedimentoMaterialValor
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentomaterialvalorRetrieve(
        id: number,
    ): CancelablePromise<ProcedimentoMaterialValor> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/enfermagem/procedimentomaterialvalor/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Valor do Material do Procedimento.
     * @param requestBody
     * @returns ProcedimentoMaterialValor
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentomaterialvalorUpdate(
        id: number,
        requestBody: ProcedimentoMaterialValorRequest,
    ): CancelablePromise<ProcedimentoMaterialValor> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/enfermagem/procedimentomaterialvalor/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Valor do Material do Procedimento.
     * @param requestBody
     * @returns ProcedimentoMaterialValor
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentomaterialvalorPartialUpdate(
        id: number,
        requestBody?: PatchedProcedimentoMaterialValorRequest,
    ): CancelablePromise<ProcedimentoMaterialValor> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/enfermagem/procedimentomaterialvalor/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Valor do Material do Procedimento.
     * @returns void
     * @throws ApiError
     */
    public static v1EnfermagemProcedimentomaterialvalorDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/enfermagem/procedimentomaterialvalor/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param atualizadoEm
     * @param criadoEm
     * @param dataRegistro
     * @param deletado
     * @param idCustom
     * @param inquilino
     * @param nome
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param paciente
     * @param prioridade * `URG` - Urgente
     * * `NOR` - Normal
     * * `BAI` - Baixa
     * @param search Um termo de busca.
     * @returns RegistroEnfermagem
     * @throws ApiError
     */
    public static v1EnfermagemRegistroenfermagemList(
        atualizadoEm?: string,
        criadoEm?: string,
        dataRegistro?: string,
        deletado?: boolean,
        idCustom?: string,
        inquilino?: number,
        nome?: string,
        ordering?: string,
        paciente?: number,
        prioridade?: 'BAI' | 'NOR' | 'URG',
        search?: string,
    ): CancelablePromise<Array<RegistroEnfermagem>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/enfermagem/registroenfermagem/',
            query: {
                'atualizado_em': atualizadoEm,
                'criado_em': criadoEm,
                'data_registro': dataRegistro,
                'deletado': deletado,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'nome': nome,
                'ordering': ordering,
                'paciente': paciente,
                'prioridade': prioridade,
                'search': search,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns RegistroEnfermagem
     * @throws ApiError
     */
    public static v1EnfermagemRegistroenfermagemCreate(
        requestBody: RegistroEnfermagemRequest,
    ): CancelablePromise<RegistroEnfermagem> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/enfermagem/registroenfermagem/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Registro de Enfermagem.
     * @returns RegistroEnfermagem
     * @throws ApiError
     */
    public static v1EnfermagemRegistroenfermagemRetrieve(
        id: number,
    ): CancelablePromise<RegistroEnfermagem> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/enfermagem/registroenfermagem/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Registro de Enfermagem.
     * @param requestBody
     * @returns RegistroEnfermagem
     * @throws ApiError
     */
    public static v1EnfermagemRegistroenfermagemUpdate(
        id: number,
        requestBody: RegistroEnfermagemRequest,
    ): CancelablePromise<RegistroEnfermagem> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/enfermagem/registroenfermagem/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Registro de Enfermagem.
     * @param requestBody
     * @returns RegistroEnfermagem
     * @throws ApiError
     */
    public static v1EnfermagemRegistroenfermagemPartialUpdate(
        id: number,
        requestBody?: PatchedRegistroEnfermagemRequest,
    ): CancelablePromise<RegistroEnfermagem> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/enfermagem/registroenfermagem/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Registro de Enfermagem.
     * @returns void
     * @throws ApiError
     */
    public static v1EnfermagemRegistroenfermagemDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/enfermagem/registroenfermagem/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param atualizadoEm
     * @param coletadoEm
     * @param criadoEm
     * @param deletado
     * @param frequenciaCardiaca
     * @param frequenciaRespiratoria
     * @param idCustom
     * @param inquilino
     * @param nome
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param registro
     * @param saturacaoOxigenio
     * @param search Um termo de busca.
     * @param temperaturaC
     * @returns SinalVitalEnfermagem
     * @throws ApiError
     */
    public static v1EnfermagemSinalvitalenfermagemList(
        atualizadoEm?: string,
        coletadoEm?: string,
        criadoEm?: string,
        deletado?: boolean,
        frequenciaCardiaca?: number,
        frequenciaRespiratoria?: number,
        idCustom?: string,
        inquilino?: number,
        nome?: string,
        ordering?: string,
        registro?: number,
        saturacaoOxigenio?: number,
        search?: string,
        temperaturaC?: number,
    ): CancelablePromise<Array<SinalVitalEnfermagem>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/enfermagem/sinalvitalenfermagem/',
            query: {
                'atualizado_em': atualizadoEm,
                'coletado_em': coletadoEm,
                'criado_em': criadoEm,
                'deletado': deletado,
                'frequencia_cardiaca': frequenciaCardiaca,
                'frequencia_respiratoria': frequenciaRespiratoria,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'nome': nome,
                'ordering': ordering,
                'registro': registro,
                'saturacao_oxigenio': saturacaoOxigenio,
                'search': search,
                'temperatura_c': temperaturaC,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns SinalVitalEnfermagem
     * @throws ApiError
     */
    public static v1EnfermagemSinalvitalenfermagemCreate(
        requestBody: SinalVitalEnfermagemRequest,
    ): CancelablePromise<SinalVitalEnfermagem> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/enfermagem/sinalvitalenfermagem/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Sinal Vital.
     * @returns SinalVitalEnfermagem
     * @throws ApiError
     */
    public static v1EnfermagemSinalvitalenfermagemRetrieve(
        id: number,
    ): CancelablePromise<SinalVitalEnfermagem> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/enfermagem/sinalvitalenfermagem/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Sinal Vital.
     * @param requestBody
     * @returns SinalVitalEnfermagem
     * @throws ApiError
     */
    public static v1EnfermagemSinalvitalenfermagemUpdate(
        id: number,
        requestBody: SinalVitalEnfermagemRequest,
    ): CancelablePromise<SinalVitalEnfermagem> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/enfermagem/sinalvitalenfermagem/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Sinal Vital.
     * @param requestBody
     * @returns SinalVitalEnfermagem
     * @throws ApiError
     */
    public static v1EnfermagemSinalvitalenfermagemPartialUpdate(
        id: number,
        requestBody?: PatchedSinalVitalEnfermagemRequest,
    ): CancelablePromise<SinalVitalEnfermagem> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/enfermagem/sinalvitalenfermagem/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Sinal Vital.
     * @returns void
     * @throws ApiError
     */
    public static v1EnfermagemSinalvitalenfermagemDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/enfermagem/sinalvitalenfermagem/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param ativo
     * @param atualizadoEm
     * @param contactos
     * @param criadoEm
     * @param deletado
     * @param email
     * @param enderecoSede
     * @param idCustom
     * @param inquilino
     * @param nib
     * @param nome
     * @param nuit
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param search Um termo de busca.
     * @param telefone1
     * @param telefone2
     * @returns Empresa
     * @throws ApiError
     */
    public static v1EntidadesEmpresaList(
        ativo?: boolean,
        atualizadoEm?: string,
        contactos?: string,
        criadoEm?: string,
        deletado?: boolean,
        email?: string,
        enderecoSede?: string,
        idCustom?: string,
        inquilino?: number,
        nib?: string,
        nome?: string,
        nuit?: string,
        ordering?: string,
        search?: string,
        telefone1?: string,
        telefone2?: string,
    ): CancelablePromise<Array<Empresa>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/entidades/empresa/',
            query: {
                'ativo': ativo,
                'atualizado_em': atualizadoEm,
                'contactos': contactos,
                'criado_em': criadoEm,
                'deletado': deletado,
                'email': email,
                'endereco_sede': enderecoSede,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'nib': nib,
                'nome': nome,
                'nuit': nuit,
                'ordering': ordering,
                'search': search,
                'telefone1': telefone1,
                'telefone2': telefone2,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns Empresa
     * @throws ApiError
     */
    public static v1EntidadesEmpresaCreate(
        requestBody: EmpresaRequest,
    ): CancelablePromise<Empresa> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/entidades/empresa/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Empresa.
     * @returns Empresa
     * @throws ApiError
     */
    public static v1EntidadesEmpresaRetrieve(
        id: number,
    ): CancelablePromise<Empresa> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/entidades/empresa/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Empresa.
     * @param requestBody
     * @returns Empresa
     * @throws ApiError
     */
    public static v1EntidadesEmpresaUpdate(
        id: number,
        requestBody: EmpresaRequest,
    ): CancelablePromise<Empresa> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/entidades/empresa/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Empresa.
     * @param requestBody
     * @returns Empresa
     * @throws ApiError
     */
    public static v1EntidadesEmpresaPartialUpdate(
        id: number,
        requestBody?: PatchedEmpresaRequest,
    ): CancelablePromise<Empresa> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/entidades/empresa/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Empresa.
     * @returns void
     * @throws ApiError
     */
    public static v1EntidadesEmpresaDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/entidades/empresa/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param atualizadoEm
     * @param atualizadoPor
     * @param criadoEm
     * @param criadoPor
     * @param deletado
     * @param deletadoEm
     * @param idCustom
     * @param inquilino
     * @param nome
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param precoUnitario
     * @param produto
     * @param quantidade
     * @param search Um termo de busca.
     * @param venda
     * @returns ItemVenda
     * @throws ApiError
     */
    public static v1FarmaciaItemvendaList(
        atualizadoEm?: string,
        atualizadoPor?: number,
        criadoEm?: string,
        criadoPor?: number,
        deletado?: boolean,
        deletadoEm?: string,
        idCustom?: string,
        inquilino?: number,
        nome?: string,
        ordering?: string,
        precoUnitario?: number,
        produto?: number,
        quantidade?: number,
        search?: string,
        venda?: number,
    ): CancelablePromise<Array<ItemVenda>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/farmacia/itemvenda/',
            query: {
                'atualizado_em': atualizadoEm,
                'atualizado_por': atualizadoPor,
                'criado_em': criadoEm,
                'criado_por': criadoPor,
                'deletado': deletado,
                'deletado_em': deletadoEm,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'nome': nome,
                'ordering': ordering,
                'preco_unitario': precoUnitario,
                'produto': produto,
                'quantidade': quantidade,
                'search': search,
                'venda': venda,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns ItemVenda
     * @throws ApiError
     */
    public static v1FarmaciaItemvendaCreate(
        requestBody: ItemVendaRequest,
    ): CancelablePromise<ItemVenda> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/farmacia/itemvenda/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Item da Venda.
     * @returns ItemVenda
     * @throws ApiError
     */
    public static v1FarmaciaItemvendaRetrieve(
        id: number,
    ): CancelablePromise<ItemVenda> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/farmacia/itemvenda/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Item da Venda.
     * @param requestBody
     * @returns ItemVenda
     * @throws ApiError
     */
    public static v1FarmaciaItemvendaUpdate(
        id: number,
        requestBody: ItemVendaRequest,
    ): CancelablePromise<ItemVenda> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/farmacia/itemvenda/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Item da Venda.
     * @param requestBody
     * @returns ItemVenda
     * @throws ApiError
     */
    public static v1FarmaciaItemvendaPartialUpdate(
        id: number,
        requestBody?: PatchedItemVendaRequest,
    ): CancelablePromise<ItemVenda> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/farmacia/itemvenda/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Item da Venda.
     * @returns void
     * @throws ApiError
     */
    public static v1FarmaciaItemvendaDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/farmacia/itemvenda/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param atualizadoEm
     * @param atualizadoPor
     * @param criadoEm
     * @param criadoPor
     * @param deletado
     * @param deletadoEm
     * @param idCustom
     * @param inquilino
     * @param nome
     * @param numeroLote
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param produto
     * @param quantidadeInicial
     * @param search Um termo de busca.
     * @param validade
     * @returns Lote
     * @throws ApiError
     */
    public static v1FarmaciaLoteList(
        atualizadoEm?: string,
        atualizadoPor?: number,
        criadoEm?: string,
        criadoPor?: number,
        deletado?: boolean,
        deletadoEm?: string,
        idCustom?: string,
        inquilino?: number,
        nome?: string,
        numeroLote?: string,
        ordering?: string,
        produto?: number,
        quantidadeInicial?: number,
        search?: string,
        validade?: string,
    ): CancelablePromise<Array<Lote>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/farmacia/lote/',
            query: {
                'atualizado_em': atualizadoEm,
                'atualizado_por': atualizadoPor,
                'criado_em': criadoEm,
                'criado_por': criadoPor,
                'deletado': deletado,
                'deletado_em': deletadoEm,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'nome': nome,
                'numero_lote': numeroLote,
                'ordering': ordering,
                'produto': produto,
                'quantidade_inicial': quantidadeInicial,
                'search': search,
                'validade': validade,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns Lote
     * @throws ApiError
     */
    public static v1FarmaciaLoteCreate(
        requestBody: LoteRequest,
    ): CancelablePromise<Lote> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/farmacia/lote/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este lote.
     * @returns Lote
     * @throws ApiError
     */
    public static v1FarmaciaLoteRetrieve(
        id: number,
    ): CancelablePromise<Lote> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/farmacia/lote/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este lote.
     * @param requestBody
     * @returns Lote
     * @throws ApiError
     */
    public static v1FarmaciaLoteUpdate(
        id: number,
        requestBody: LoteRequest,
    ): CancelablePromise<Lote> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/farmacia/lote/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este lote.
     * @param requestBody
     * @returns Lote
     * @throws ApiError
     */
    public static v1FarmaciaLotePartialUpdate(
        id: number,
        requestBody?: PatchedLoteRequest,
    ): CancelablePromise<Lote> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/farmacia/lote/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este lote.
     * @returns void
     * @throws ApiError
     */
    public static v1FarmaciaLoteDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/farmacia/lote/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param atualizadoEm
     * @param atualizadoPor
     * @param criadoEm
     * @param criadoPor
     * @param deletado
     * @param deletadoEm
     * @param idCustom
     * @param inquilino
     * @param itemVenda
     * @param lote
     * @param nome
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param origem * `VEND` - Venda
     * * `PROC` - Procedimento
     * * `AJUS` - Ajuste
     * @param quantidade
     * @param search Um termo de busca.
     * @param tipo * `ENT` - Entrada
     * * `SAI` - Saída
     * * `AJU` - Ajuste
     * @returns MovimentoEstoque
     * @throws ApiError
     */
    public static v1FarmaciaMovimentoestoqueList(
        atualizadoEm?: string,
        atualizadoPor?: number,
        criadoEm?: string,
        criadoPor?: number,
        deletado?: boolean,
        deletadoEm?: string,
        idCustom?: string,
        inquilino?: number,
        itemVenda?: number,
        lote?: number,
        nome?: string,
        ordering?: string,
        origem?: 'AJUS' | 'PROC' | 'VEND',
        quantidade?: number,
        search?: string,
        tipo?: 'AJU' | 'ENT' | 'SAI',
    ): CancelablePromise<Array<MovimentoEstoque>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/farmacia/movimentoestoque/',
            query: {
                'atualizado_em': atualizadoEm,
                'atualizado_por': atualizadoPor,
                'criado_em': criadoEm,
                'criado_por': criadoPor,
                'deletado': deletado,
                'deletado_em': deletadoEm,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'item_venda': itemVenda,
                'lote': lote,
                'nome': nome,
                'ordering': ordering,
                'origem': origem,
                'quantidade': quantidade,
                'search': search,
                'tipo': tipo,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns MovimentoEstoque
     * @throws ApiError
     */
    public static v1FarmaciaMovimentoestoqueCreate(
        requestBody: MovimentoEstoqueRequest,
    ): CancelablePromise<MovimentoEstoque> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/farmacia/movimentoestoque/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este movimento estoque.
     * @returns MovimentoEstoque
     * @throws ApiError
     */
    public static v1FarmaciaMovimentoestoqueRetrieve(
        id: number,
    ): CancelablePromise<MovimentoEstoque> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/farmacia/movimentoestoque/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este movimento estoque.
     * @param requestBody
     * @returns MovimentoEstoque
     * @throws ApiError
     */
    public static v1FarmaciaMovimentoestoqueUpdate(
        id: number,
        requestBody: MovimentoEstoqueRequest,
    ): CancelablePromise<MovimentoEstoque> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/farmacia/movimentoestoque/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este movimento estoque.
     * @param requestBody
     * @returns MovimentoEstoque
     * @throws ApiError
     */
    public static v1FarmaciaMovimentoestoquePartialUpdate(
        id: number,
        requestBody?: PatchedMovimentoEstoqueRequest,
    ): CancelablePromise<MovimentoEstoque> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/farmacia/movimentoestoque/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este movimento estoque.
     * @returns void
     * @throws ApiError
     */
    public static v1FarmaciaMovimentoestoqueDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/farmacia/movimentoestoque/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param atualizadoEm
     * @param atualizadoPor
     * @param criadoEm
     * @param criadoPor
     * @param deletado
     * @param deletadoEm
     * @param idCustom
     * @param inquilino
     * @param nome
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param precoVenda
     * @param search Um termo de busca.
     * @param tipo * `MED` - Medicamento
     * * `MAT` - Material
     * * `OUT` - Outro
     * @returns Produto
     * @throws ApiError
     */
    public static v1FarmaciaProdutoList(
        atualizadoEm?: string,
        atualizadoPor?: number,
        criadoEm?: string,
        criadoPor?: number,
        deletado?: boolean,
        deletadoEm?: string,
        idCustom?: string,
        inquilino?: number,
        nome?: string,
        ordering?: string,
        precoVenda?: number,
        search?: string,
        tipo?: 'MAT' | 'MED' | 'OUT',
    ): CancelablePromise<Array<Produto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/farmacia/produto/',
            query: {
                'atualizado_em': atualizadoEm,
                'atualizado_por': atualizadoPor,
                'criado_em': criadoEm,
                'criado_por': criadoPor,
                'deletado': deletado,
                'deletado_em': deletadoEm,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'nome': nome,
                'ordering': ordering,
                'preco_venda': precoVenda,
                'search': search,
                'tipo': tipo,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns Produto
     * @throws ApiError
     */
    public static v1FarmaciaProdutoCreate(
        requestBody: ProdutoRequest,
    ): CancelablePromise<Produto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/farmacia/produto/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Produto.
     * @returns Produto
     * @throws ApiError
     */
    public static v1FarmaciaProdutoRetrieve(
        id: number,
    ): CancelablePromise<Produto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/farmacia/produto/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Produto.
     * @param requestBody
     * @returns Produto
     * @throws ApiError
     */
    public static v1FarmaciaProdutoUpdate(
        id: number,
        requestBody: ProdutoRequest,
    ): CancelablePromise<Produto> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/farmacia/produto/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Produto.
     * @param requestBody
     * @returns Produto
     * @throws ApiError
     */
    public static v1FarmaciaProdutoPartialUpdate(
        id: number,
        requestBody?: PatchedProdutoRequest,
    ): CancelablePromise<Produto> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/farmacia/produto/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Produto.
     * @returns void
     * @throws ApiError
     */
    public static v1FarmaciaProdutoDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/farmacia/produto/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param atualizadoEm
     * @param atualizadoPor
     * @param criadoEm
     * @param criadoPor
     * @param deletado
     * @param deletadoEm
     * @param idCustom
     * @param inquilino
     * @param numero
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param search Um termo de busca.
     * @param total
     * @returns Venda
     * @throws ApiError
     */
    public static v1FarmaciaVendaList(
        atualizadoEm?: string,
        atualizadoPor?: number,
        criadoEm?: string,
        criadoPor?: number,
        deletado?: boolean,
        deletadoEm?: string,
        idCustom?: string,
        inquilino?: number,
        numero?: string,
        ordering?: string,
        search?: string,
        total?: number,
    ): CancelablePromise<Array<Venda>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/farmacia/venda/',
            query: {
                'atualizado_em': atualizadoEm,
                'atualizado_por': atualizadoPor,
                'criado_em': criadoEm,
                'criado_por': criadoPor,
                'deletado': deletado,
                'deletado_em': deletadoEm,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'numero': numero,
                'ordering': ordering,
                'search': search,
                'total': total,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns Venda
     * @throws ApiError
     */
    public static v1FarmaciaVendaCreate(
        requestBody: VendaRequest,
    ): CancelablePromise<Venda> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/farmacia/venda/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Venda.
     * @returns Venda
     * @throws ApiError
     */
    public static v1FarmaciaVendaRetrieve(
        id: number,
    ): CancelablePromise<Venda> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/farmacia/venda/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Venda.
     * @param requestBody
     * @returns Venda
     * @throws ApiError
     */
    public static v1FarmaciaVendaUpdate(
        id: number,
        requestBody: VendaRequest,
    ): CancelablePromise<Venda> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/farmacia/venda/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Venda.
     * @param requestBody
     * @returns Venda
     * @throws ApiError
     */
    public static v1FarmaciaVendaPartialUpdate(
        id: number,
        requestBody?: PatchedVendaRequest,
    ): CancelablePromise<Venda> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/farmacia/venda/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Venda.
     * @returns void
     * @throws ApiError
     */
    public static v1FarmaciaVendaDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/farmacia/venda/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param atualizadoEm
     * @param atualizadoPor
     * @param cirurgia
     * @param criadoEm
     * @param criadoPor
     * @param deletado
     * @param deletadoEm
     * @param estado * `RASC` - Rascunho
     * * `EMIT` - Emitida
     * * `PAGA` - Paga
     * * `CANC` - Cancelada
     * @param idCustom
     * @param inquilino
     * @param ivaValor
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param paciente
     * @param requisicao
     * @param search Um termo de busca.
     * @param subtotal
     * @param total
     * @param valorPaciente
     * @param valorSeguro
     * @returns Fatura
     * @throws ApiError
     */
    public static v1FaturamentoFaturaList(
        atualizadoEm?: string,
        atualizadoPor?: number,
        cirurgia?: number,
        criadoEm?: string,
        criadoPor?: number,
        deletado?: boolean,
        deletadoEm?: string,
        estado?: 'CANC' | 'EMIT' | 'PAGA' | 'RASC',
        idCustom?: string,
        inquilino?: number,
        ivaValor?: number,
        ordering?: string,
        paciente?: number,
        requisicao?: number,
        search?: string,
        subtotal?: number,
        total?: number,
        valorPaciente?: number,
        valorSeguro?: number,
    ): CancelablePromise<Array<Fatura>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/faturamento/fatura/',
            query: {
                'atualizado_em': atualizadoEm,
                'atualizado_por': atualizadoPor,
                'cirurgia': cirurgia,
                'criado_em': criadoEm,
                'criado_por': criadoPor,
                'deletado': deletado,
                'deletado_em': deletadoEm,
                'estado': estado,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'iva_valor': ivaValor,
                'ordering': ordering,
                'paciente': paciente,
                'requisicao': requisicao,
                'search': search,
                'subtotal': subtotal,
                'total': total,
                'valor_paciente': valorPaciente,
                'valor_seguro': valorSeguro,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns Fatura
     * @throws ApiError
     */
    public static v1FaturamentoFaturaCreate(
        requestBody: FaturaRequest,
    ): CancelablePromise<Fatura> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/faturamento/fatura/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Fatura.
     * @returns Fatura
     * @throws ApiError
     */
    public static v1FaturamentoFaturaRetrieve(
        id: number,
    ): CancelablePromise<Fatura> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/faturamento/fatura/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Fatura.
     * @param requestBody
     * @returns Fatura
     * @throws ApiError
     */
    public static v1FaturamentoFaturaUpdate(
        id: number,
        requestBody: FaturaRequest,
    ): CancelablePromise<Fatura> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/faturamento/fatura/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Fatura.
     * @param requestBody
     * @returns Fatura
     * @throws ApiError
     */
    public static v1FaturamentoFaturaPartialUpdate(
        id: number,
        requestBody?: PatchedFaturaRequest,
    ): CancelablePromise<Fatura> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/faturamento/fatura/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Fatura.
     * @returns void
     * @throws ApiError
     */
    public static v1FaturamentoFaturaDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/faturamento/fatura/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Fatura.
     * @param requestBody
     * @returns Fatura
     * @throws ApiError
     */
    public static v1FaturamentoFaturaAnularCreate(
        id: number,
        requestBody: FaturaRequest,
    ): CancelablePromise<Fatura> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/faturamento/fatura/{id}/anular/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Fatura.
     * @param requestBody
     * @returns Fatura
     * @throws ApiError
     */
    public static v1FaturamentoFaturaEmitirCreate(
        id: number,
        requestBody: FaturaRequest,
    ): CancelablePromise<Fatura> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/faturamento/fatura/{id}/emitir/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Fatura.
     * @returns Fatura
     * @throws ApiError
     */
    public static v1FaturamentoFaturaPdfRetrieve(
        id: number,
    ): CancelablePromise<Fatura> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/faturamento/fatura/{id}/pdf/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param atualizadoEm
     * @param atualizadoPor
     * @param criadoEm
     * @param criadoPor
     * @param deletado
     * @param deletadoEm
     * @param descricao
     * @param exame
     * @param fatura
     * @param idCustom
     * @param inquilino
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param precoUnitario
     * @param quantidade
     * @param search Um termo de busca.
     * @returns FaturaItem
     * @throws ApiError
     */
    public static v1FaturamentoFaturaitemList(
        atualizadoEm?: string,
        atualizadoPor?: number,
        criadoEm?: string,
        criadoPor?: number,
        deletado?: boolean,
        deletadoEm?: string,
        descricao?: string,
        exame?: number,
        fatura?: number,
        idCustom?: string,
        inquilino?: number,
        ordering?: string,
        precoUnitario?: number,
        quantidade?: number,
        search?: string,
    ): CancelablePromise<Array<FaturaItem>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/faturamento/faturaitem/',
            query: {
                'atualizado_em': atualizadoEm,
                'atualizado_por': atualizadoPor,
                'criado_em': criadoEm,
                'criado_por': criadoPor,
                'deletado': deletado,
                'deletado_em': deletadoEm,
                'descricao': descricao,
                'exame': exame,
                'fatura': fatura,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'ordering': ordering,
                'preco_unitario': precoUnitario,
                'quantidade': quantidade,
                'search': search,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns FaturaItem
     * @throws ApiError
     */
    public static v1FaturamentoFaturaitemCreate(
        requestBody: FaturaItemRequest,
    ): CancelablePromise<FaturaItem> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/faturamento/faturaitem/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Item de Fatura.
     * @returns FaturaItem
     * @throws ApiError
     */
    public static v1FaturamentoFaturaitemRetrieve(
        id: number,
    ): CancelablePromise<FaturaItem> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/faturamento/faturaitem/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Item de Fatura.
     * @param requestBody
     * @returns FaturaItem
     * @throws ApiError
     */
    public static v1FaturamentoFaturaitemUpdate(
        id: number,
        requestBody: FaturaItemRequest,
    ): CancelablePromise<FaturaItem> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/faturamento/faturaitem/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Item de Fatura.
     * @param requestBody
     * @returns FaturaItem
     * @throws ApiError
     */
    public static v1FaturamentoFaturaitemPartialUpdate(
        id: number,
        requestBody?: PatchedFaturaItemRequest,
    ): CancelablePromise<FaturaItem> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/faturamento/faturaitem/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Item de Fatura.
     * @returns void
     * @throws ApiError
     */
    public static v1FaturamentoFaturaitemDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/faturamento/faturaitem/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param criadoEm
     * @param descricao
     * @param fatura
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param search Um termo de busca.
     * @param tipoEvento
     * @returns HistoricoFatura
     * @throws ApiError
     */
    public static v1FaturamentoHistoricofaturaList(
        criadoEm?: string,
        descricao?: string,
        fatura?: number,
        ordering?: string,
        search?: string,
        tipoEvento?: string,
    ): CancelablePromise<Array<HistoricoFatura>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/faturamento/historicofatura/',
            query: {
                'criado_em': criadoEm,
                'descricao': descricao,
                'fatura': fatura,
                'ordering': ordering,
                'search': search,
                'tipo_evento': tipoEvento,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns HistoricoFatura
     * @throws ApiError
     */
    public static v1FaturamentoHistoricofaturaCreate(
        requestBody: HistoricoFaturaRequest,
    ): CancelablePromise<HistoricoFatura> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/faturamento/historicofatura/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Histórico de Fatura.
     * @returns HistoricoFatura
     * @throws ApiError
     */
    public static v1FaturamentoHistoricofaturaRetrieve(
        id: number,
    ): CancelablePromise<HistoricoFatura> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/faturamento/historicofatura/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Histórico de Fatura.
     * @param requestBody
     * @returns HistoricoFatura
     * @throws ApiError
     */
    public static v1FaturamentoHistoricofaturaUpdate(
        id: number,
        requestBody: HistoricoFaturaRequest,
    ): CancelablePromise<HistoricoFatura> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/faturamento/historicofatura/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Histórico de Fatura.
     * @param requestBody
     * @returns HistoricoFatura
     * @throws ApiError
     */
    public static v1FaturamentoHistoricofaturaPartialUpdate(
        id: number,
        requestBody?: PatchedHistoricoFaturaRequest,
    ): CancelablePromise<HistoricoFatura> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/faturamento/historicofatura/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Histórico de Fatura.
     * @returns void
     * @throws ApiError
     */
    public static v1FaturamentoHistoricofaturaDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/faturamento/historicofatura/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param criadoEm
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param search Um termo de busca.
     * @param token
     * @param usado
     * @param user
     * @returns PasswordResetToken
     * @throws ApiError
     */
    public static v1IdentidadePasswordresettokenList(
        criadoEm?: string,
        ordering?: string,
        search?: string,
        token?: string,
        usado?: boolean,
        user?: number,
    ): CancelablePromise<Array<PasswordResetToken>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/identidade/passwordresettoken/',
            query: {
                'criado_em': criadoEm,
                'ordering': ordering,
                'search': search,
                'token': token,
                'usado': usado,
                'user': user,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns PasswordResetToken
     * @throws ApiError
     */
    public static v1IdentidadePasswordresettokenCreate(
        requestBody: PasswordResetTokenRequest,
    ): CancelablePromise<PasswordResetToken> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/identidade/passwordresettoken/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Token de Reset de Password.
     * @returns PasswordResetToken
     * @throws ApiError
     */
    public static v1IdentidadePasswordresettokenRetrieve(
        id: number,
    ): CancelablePromise<PasswordResetToken> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/identidade/passwordresettoken/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Token de Reset de Password.
     * @param requestBody
     * @returns PasswordResetToken
     * @throws ApiError
     */
    public static v1IdentidadePasswordresettokenUpdate(
        id: number,
        requestBody: PasswordResetTokenRequest,
    ): CancelablePromise<PasswordResetToken> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/identidade/passwordresettoken/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Token de Reset de Password.
     * @param requestBody
     * @returns PasswordResetToken
     * @throws ApiError
     */
    public static v1IdentidadePasswordresettokenPartialUpdate(
        id: number,
        requestBody?: PatchedPasswordResetTokenRequest,
    ): CancelablePromise<PasswordResetToken> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/identidade/passwordresettoken/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Token de Reset de Password.
     * @returns void
     * @throws ApiError
     */
    public static v1IdentidadePasswordresettokenDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/identidade/passwordresettoken/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param ativo
     * @param atualizadoEm
     * @param cargo
     * @param criadoEm
     * @param departamento
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param registroProfissional
     * @param search Um termo de busca.
     * @param usuario
     * @returns PerfilProfissional
     * @throws ApiError
     */
    public static v1IdentidadePerfilprofissionalList(
        ativo?: boolean,
        atualizadoEm?: string,
        cargo?: string,
        criadoEm?: string,
        departamento?: string,
        ordering?: string,
        registroProfissional?: string,
        search?: string,
        usuario?: number,
    ): CancelablePromise<Array<PerfilProfissional>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/identidade/perfilprofissional/',
            query: {
                'ativo': ativo,
                'atualizado_em': atualizadoEm,
                'cargo': cargo,
                'criado_em': criadoEm,
                'departamento': departamento,
                'ordering': ordering,
                'registro_profissional': registroProfissional,
                'search': search,
                'usuario': usuario,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns PerfilProfissional
     * @throws ApiError
     */
    public static v1IdentidadePerfilprofissionalCreate(
        requestBody: PerfilProfissionalRequest,
    ): CancelablePromise<PerfilProfissional> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/identidade/perfilprofissional/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Perfil Profissional.
     * @returns PerfilProfissional
     * @throws ApiError
     */
    public static v1IdentidadePerfilprofissionalRetrieve(
        id: number,
    ): CancelablePromise<PerfilProfissional> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/identidade/perfilprofissional/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Perfil Profissional.
     * @param requestBody
     * @returns PerfilProfissional
     * @throws ApiError
     */
    public static v1IdentidadePerfilprofissionalUpdate(
        id: number,
        requestBody: PerfilProfissionalRequest,
    ): CancelablePromise<PerfilProfissional> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/identidade/perfilprofissional/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Perfil Profissional.
     * @param requestBody
     * @returns PerfilProfissional
     * @throws ApiError
     */
    public static v1IdentidadePerfilprofissionalPartialUpdate(
        id: number,
        requestBody?: PatchedPerfilProfissionalRequest,
    ): CancelablePromise<PerfilProfissional> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/identidade/perfilprofissional/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Perfil Profissional.
     * @returns void
     * @throws ApiError
     */
    public static v1IdentidadePerfilprofissionalDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/identidade/perfilprofissional/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param dateJoined
     * @param email
     * @param firstName
     * @param isActive
     * @param isStaff
     * @param isSuperuser
     * @param lastLogin
     * @param lastName
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param password
     * @param search Um termo de busca.
     * @param telefone
     * @returns Usuario
     * @throws ApiError
     */
    public static v1IdentidadeUsuarioList(
        dateJoined?: string,
        email?: string,
        firstName?: string,
        isActive?: boolean,
        isStaff?: boolean,
        isSuperuser?: boolean,
        lastLogin?: string,
        lastName?: string,
        ordering?: string,
        password?: string,
        search?: string,
        telefone?: string,
    ): CancelablePromise<Array<Usuario>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/identidade/usuario/',
            query: {
                'date_joined': dateJoined,
                'email': email,
                'first_name': firstName,
                'is_active': isActive,
                'is_staff': isStaff,
                'is_superuser': isSuperuser,
                'last_login': lastLogin,
                'last_name': lastName,
                'ordering': ordering,
                'password': password,
                'search': search,
                'telefone': telefone,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns Usuario
     * @throws ApiError
     */
    public static v1IdentidadeUsuarioCreate(
        requestBody: UsuarioRequest,
    ): CancelablePromise<Usuario> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/identidade/usuario/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Usuário.
     * @returns Usuario
     * @throws ApiError
     */
    public static v1IdentidadeUsuarioRetrieve(
        id: number,
    ): CancelablePromise<Usuario> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/identidade/usuario/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Usuário.
     * @param requestBody
     * @returns Usuario
     * @throws ApiError
     */
    public static v1IdentidadeUsuarioUpdate(
        id: number,
        requestBody: UsuarioRequest,
    ): CancelablePromise<Usuario> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/identidade/usuario/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Usuário.
     * @param requestBody
     * @returns Usuario
     * @throws ApiError
     */
    public static v1IdentidadeUsuarioPartialUpdate(
        id: number,
        requestBody?: PatchedUsuarioRequest,
    ): CancelablePromise<Usuario> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/identidade/usuario/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Usuário.
     * @returns void
     * @throws ApiError
     */
    public static v1IdentidadeUsuarioDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/identidade/usuario/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param atualizadoEm
     * @param atualizadoPor
     * @param criadoEm
     * @param criadoPor
     * @param deletado
     * @param deletadoEm
     * @param fusoHorario
     * @param idCustom
     * @param idioma
     * @param inquilino
     * @param limiteUsuarios
     * @param moeda
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param permiteMultiUnidade
     * @param search Um termo de busca.
     * @returns ConfiguracaoInquilino
     * @throws ApiError
     */
    public static v1InquilinosConfiguracaoinquilinoList(
        atualizadoEm?: string,
        atualizadoPor?: number,
        criadoEm?: string,
        criadoPor?: number,
        deletado?: boolean,
        deletadoEm?: string,
        fusoHorario?: string,
        idCustom?: string,
        idioma?: string,
        inquilino?: number,
        limiteUsuarios?: number,
        moeda?: string,
        ordering?: string,
        permiteMultiUnidade?: boolean,
        search?: string,
    ): CancelablePromise<Array<ConfiguracaoInquilino>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/inquilinos/configuracaoinquilino/',
            query: {
                'atualizado_em': atualizadoEm,
                'atualizado_por': atualizadoPor,
                'criado_em': criadoEm,
                'criado_por': criadoPor,
                'deletado': deletado,
                'deletado_em': deletadoEm,
                'fuso_horario': fusoHorario,
                'id_custom': idCustom,
                'idioma': idioma,
                'inquilino': inquilino,
                'limite_usuarios': limiteUsuarios,
                'moeda': moeda,
                'ordering': ordering,
                'permite_multi_unidade': permiteMultiUnidade,
                'search': search,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns ConfiguracaoInquilino
     * @throws ApiError
     */
    public static v1InquilinosConfiguracaoinquilinoCreate(
        requestBody: ConfiguracaoInquilinoRequest,
    ): CancelablePromise<ConfiguracaoInquilino> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/inquilinos/configuracaoinquilino/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Configuração do Inquilino.
     * @returns ConfiguracaoInquilino
     * @throws ApiError
     */
    public static v1InquilinosConfiguracaoinquilinoRetrieve(
        id: number,
    ): CancelablePromise<ConfiguracaoInquilino> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/inquilinos/configuracaoinquilino/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Configuração do Inquilino.
     * @param requestBody
     * @returns ConfiguracaoInquilino
     * @throws ApiError
     */
    public static v1InquilinosConfiguracaoinquilinoUpdate(
        id: number,
        requestBody: ConfiguracaoInquilinoRequest,
    ): CancelablePromise<ConfiguracaoInquilino> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/inquilinos/configuracaoinquilino/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Configuração do Inquilino.
     * @param requestBody
     * @returns ConfiguracaoInquilino
     * @throws ApiError
     */
    public static v1InquilinosConfiguracaoinquilinoPartialUpdate(
        id: number,
        requestBody?: PatchedConfiguracaoInquilinoRequest,
    ): CancelablePromise<ConfiguracaoInquilino> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/inquilinos/configuracaoinquilino/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Configuração do Inquilino.
     * @returns void
     * @throws ApiError
     */
    public static v1InquilinosConfiguracaoinquilinoDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/inquilinos/configuracaoinquilino/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param ativo
     * @param atualizadoEm
     * @param atualizadoPor
     * @param chave
     * @param criadoEm
     * @param criadoPor
     * @param deletado
     * @param deletadoEm
     * @param idCustom
     * @param inquilino
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param search Um termo de busca.
     * @returns FeatureFlagTenant
     * @throws ApiError
     */
    public static v1InquilinosFeatureflagtenantList(
        ativo?: boolean,
        atualizadoEm?: string,
        atualizadoPor?: number,
        chave?: string,
        criadoEm?: string,
        criadoPor?: number,
        deletado?: boolean,
        deletadoEm?: string,
        idCustom?: string,
        inquilino?: number,
        ordering?: string,
        search?: string,
    ): CancelablePromise<Array<FeatureFlagTenant>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/inquilinos/featureflagtenant/',
            query: {
                'ativo': ativo,
                'atualizado_em': atualizadoEm,
                'atualizado_por': atualizadoPor,
                'chave': chave,
                'criado_em': criadoEm,
                'criado_por': criadoPor,
                'deletado': deletado,
                'deletado_em': deletadoEm,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'ordering': ordering,
                'search': search,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns FeatureFlagTenant
     * @throws ApiError
     */
    public static v1InquilinosFeatureflagtenantCreate(
        requestBody: FeatureFlagTenantRequest,
    ): CancelablePromise<FeatureFlagTenant> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/inquilinos/featureflagtenant/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Feature Flag (Tenant).
     * @returns FeatureFlagTenant
     * @throws ApiError
     */
    public static v1InquilinosFeatureflagtenantRetrieve(
        id: number,
    ): CancelablePromise<FeatureFlagTenant> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/inquilinos/featureflagtenant/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Feature Flag (Tenant).
     * @param requestBody
     * @returns FeatureFlagTenant
     * @throws ApiError
     */
    public static v1InquilinosFeatureflagtenantUpdate(
        id: number,
        requestBody: FeatureFlagTenantRequest,
    ): CancelablePromise<FeatureFlagTenant> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/inquilinos/featureflagtenant/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Feature Flag (Tenant).
     * @param requestBody
     * @returns FeatureFlagTenant
     * @throws ApiError
     */
    public static v1InquilinosFeatureflagtenantPartialUpdate(
        id: number,
        requestBody?: PatchedFeatureFlagTenantRequest,
    ): CancelablePromise<FeatureFlagTenant> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/inquilinos/featureflagtenant/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Feature Flag (Tenant).
     * @returns void
     * @throws ApiError
     */
    public static v1InquilinosFeatureflagtenantDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/inquilinos/featureflagtenant/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param ativo
     * @param atualizadoEm
     * @param atualizadoPor
     * @param bloqueadoEm
     * @param criadoEm
     * @param criadoPor
     * @param deletado
     * @param deletadoEm
     * @param dominio
     * @param idCustom
     * @param identificador
     * @param nome
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param search Um termo de busca.
     * @param statusComercial * `TRIAL` - Trial
     * * `ATIVO` - Ativo
     * * `SUSPENSO` - Suspenso
     * @param trialAte
     * @returns Inquilino
     * @throws ApiError
     */
    public static v1InquilinosInquilinoList(
        ativo?: boolean,
        atualizadoEm?: string,
        atualizadoPor?: number,
        bloqueadoEm?: string,
        criadoEm?: string,
        criadoPor?: number,
        deletado?: boolean,
        deletadoEm?: string,
        dominio?: string,
        idCustom?: string,
        identificador?: string,
        nome?: string,
        ordering?: string,
        search?: string,
        statusComercial?: 'ATIVO' | 'SUSPENSO' | 'TRIAL',
        trialAte?: string,
    ): CancelablePromise<Array<Inquilino>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/inquilinos/inquilino/',
            query: {
                'ativo': ativo,
                'atualizado_em': atualizadoEm,
                'atualizado_por': atualizadoPor,
                'bloqueado_em': bloqueadoEm,
                'criado_em': criadoEm,
                'criado_por': criadoPor,
                'deletado': deletado,
                'deletado_em': deletadoEm,
                'dominio': dominio,
                'id_custom': idCustom,
                'identificador': identificador,
                'nome': nome,
                'ordering': ordering,
                'search': search,
                'status_comercial': statusComercial,
                'trial_ate': trialAte,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns Inquilino
     * @throws ApiError
     */
    public static v1InquilinosInquilinoCreate(
        requestBody: InquilinoRequest,
    ): CancelablePromise<Inquilino> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/inquilinos/inquilino/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Inquilino.
     * @returns Inquilino
     * @throws ApiError
     */
    public static v1InquilinosInquilinoRetrieve(
        id: number,
    ): CancelablePromise<Inquilino> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/inquilinos/inquilino/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Inquilino.
     * @param requestBody
     * @returns Inquilino
     * @throws ApiError
     */
    public static v1InquilinosInquilinoUpdate(
        id: number,
        requestBody: InquilinoRequest,
    ): CancelablePromise<Inquilino> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/inquilinos/inquilino/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Inquilino.
     * @param requestBody
     * @returns Inquilino
     * @throws ApiError
     */
    public static v1InquilinosInquilinoPartialUpdate(
        id: number,
        requestBody?: PatchedInquilinoRequest,
    ): CancelablePromise<Inquilino> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/inquilinos/inquilino/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Inquilino.
     * @returns void
     * @throws ApiError
     */
    public static v1InquilinosInquilinoDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/inquilinos/inquilino/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param ativo
     * @param atualizadoEm
     * @param atualizadoPor
     * @param criadoEm
     * @param criadoPor
     * @param deletado
     * @param deletadoEm
     * @param descricao
     * @param idCustom
     * @param limiteRequisicoesMes
     * @param limiteUsuarios
     * @param nome
     * @param ordem
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param permiteMultiUnidade
     * @param precoExcedenteRequisicao
     * @param precoMensal
     * @param search Um termo de busca.
     * @param suportePrioritario
     * @param tipo * `FREE` - Free
     * * `BASIC` - Basic
     * * `PRO` - Pro
     * @returns PlanoAssinatura
     * @throws ApiError
     */
    public static v1InquilinosPlanoassinaturaList(
        ativo?: boolean,
        atualizadoEm?: string,
        atualizadoPor?: number,
        criadoEm?: string,
        criadoPor?: number,
        deletado?: boolean,
        deletadoEm?: string,
        descricao?: string,
        idCustom?: string,
        limiteRequisicoesMes?: number,
        limiteUsuarios?: number,
        nome?: string,
        ordem?: number,
        ordering?: string,
        permiteMultiUnidade?: boolean,
        precoExcedenteRequisicao?: number,
        precoMensal?: number,
        search?: string,
        suportePrioritario?: boolean,
        tipo?: 'BASIC' | 'FREE' | 'PRO',
    ): CancelablePromise<Array<PlanoAssinatura>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/inquilinos/planoassinatura/',
            query: {
                'ativo': ativo,
                'atualizado_em': atualizadoEm,
                'atualizado_por': atualizadoPor,
                'criado_em': criadoEm,
                'criado_por': criadoPor,
                'deletado': deletado,
                'deletado_em': deletadoEm,
                'descricao': descricao,
                'id_custom': idCustom,
                'limite_requisicoes_mes': limiteRequisicoesMes,
                'limite_usuarios': limiteUsuarios,
                'nome': nome,
                'ordem': ordem,
                'ordering': ordering,
                'permite_multi_unidade': permiteMultiUnidade,
                'preco_excedente_requisicao': precoExcedenteRequisicao,
                'preco_mensal': precoMensal,
                'search': search,
                'suporte_prioritario': suportePrioritario,
                'tipo': tipo,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns PlanoAssinatura
     * @throws ApiError
     */
    public static v1InquilinosPlanoassinaturaCreate(
        requestBody: PlanoAssinaturaRequest,
    ): CancelablePromise<PlanoAssinatura> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/inquilinos/planoassinatura/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Plano de Assinatura.
     * @returns PlanoAssinatura
     * @throws ApiError
     */
    public static v1InquilinosPlanoassinaturaRetrieve(
        id: number,
    ): CancelablePromise<PlanoAssinatura> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/inquilinos/planoassinatura/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Plano de Assinatura.
     * @param requestBody
     * @returns PlanoAssinatura
     * @throws ApiError
     */
    public static v1InquilinosPlanoassinaturaUpdate(
        id: number,
        requestBody: PlanoAssinaturaRequest,
    ): CancelablePromise<PlanoAssinatura> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/inquilinos/planoassinatura/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Plano de Assinatura.
     * @param requestBody
     * @returns PlanoAssinatura
     * @throws ApiError
     */
    public static v1InquilinosPlanoassinaturaPartialUpdate(
        id: number,
        requestBody?: PatchedPlanoAssinaturaRequest,
    ): CancelablePromise<PlanoAssinatura> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/inquilinos/planoassinatura/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Plano de Assinatura.
     * @returns void
     * @throws ApiError
     */
    public static v1InquilinosPlanoassinaturaDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/inquilinos/planoassinatura/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param atualizadoEm
     * @param atualizadoPor
     * @param criadoEm
     * @param criadoPor
     * @param deletado
     * @param deletadoEm
     * @param idCustom
     * @param inquilino
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param requisicoesMesAtual
     * @param search Um termo de busca.
     * @param usuariosAtivos
     * @returns UsoTenant
     * @throws ApiError
     */
    public static v1InquilinosUsotenantList(
        atualizadoEm?: string,
        atualizadoPor?: number,
        criadoEm?: string,
        criadoPor?: number,
        deletado?: boolean,
        deletadoEm?: string,
        idCustom?: string,
        inquilino?: number,
        ordering?: string,
        requisicoesMesAtual?: number,
        search?: string,
        usuariosAtivos?: number,
    ): CancelablePromise<Array<UsoTenant>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/inquilinos/usotenant/',
            query: {
                'atualizado_em': atualizadoEm,
                'atualizado_por': atualizadoPor,
                'criado_em': criadoEm,
                'criado_por': criadoPor,
                'deletado': deletado,
                'deletado_em': deletadoEm,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'ordering': ordering,
                'requisicoes_mes_atual': requisicoesMesAtual,
                'search': search,
                'usuarios_ativos': usuariosAtivos,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param requestBody
     * @returns UsoTenant
     * @throws ApiError
     */
    public static v1InquilinosUsotenantCreate(
        requestBody: UsoTenantRequest,
    ): CancelablePromise<UsoTenant> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/inquilinos/usotenant/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Uso do Tenant.
     * @returns UsoTenant
     * @throws ApiError
     */
    public static v1InquilinosUsotenantRetrieve(
        id: number,
    ): CancelablePromise<UsoTenant> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/inquilinos/usotenant/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Uso do Tenant.
     * @param requestBody
     * @returns UsoTenant
     * @throws ApiError
     */
    public static v1InquilinosUsotenantUpdate(
        id: number,
        requestBody: UsoTenantRequest,
    ): CancelablePromise<UsoTenant> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/inquilinos/usotenant/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Uso do Tenant.
     * @param requestBody
     * @returns UsoTenant
     * @throws ApiError
     */
    public static v1InquilinosUsotenantPartialUpdate(
        id: number,
        requestBody?: PatchedUsoTenantRequest,
    ): CancelablePromise<UsoTenant> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/inquilinos/usotenant/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
     * `search_fields`/`ordering_fields`.
     *
     * - Remove campos invalidos (para nao quebrar em runtime).
     * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
     * para ser inspecionada por testes/CI.
     * @param id Um valor inteiro único que identifica este Uso do Tenant.
     * @returns void
     * @throws ApiError
     */
    public static v1InquilinosUsotenantDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/inquilinos/usotenant/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Inbox de resultados para equipamentos (HTTP JSON).
     *
     * Autenticação: header `X-Integration-Key`.
     *
     * Payload (exemplo):
     * {
         * "message_id": "uuid-externo-opcional",
         * "accession": "ORD-....",
         * "results": [{"codigo": "HB", "valor": "13.2"}, ...],
         * "documentos": [{"filename":"ecg.pdf","content_type":"application/pdf","base64":"...","requisicao_item_id": 123}]
         * }
         * @param xIntegrationKey Chave de integração
         * @param equipamentoIdCustom
         * @param requestBody
         * @returns ResultadosInboxResponse
         * @throws ApiError
         */
        public static v1IntegracoesEquipamentosResultadosCreate(
            xIntegrationKey: string,
            equipamentoIdCustom: string,
            requestBody: ResultadosInboxRequestRequest,
        ): CancelablePromise<ResultadosInboxResponse> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/integracoes/equipamentos/{equipamento_id_custom}/resultados/',
                path: {
                    'equipamento_id_custom': equipamentoIdCustom,
                },
                headers: {
                    'X-Integration-Key': xIntegrationKey,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Worklist para equipamentos (HTTP JSON).
         *
         * Autenticação: header `X-Integration-Key`.
         * @param xIntegrationKey Chave de integração
         * @param equipamentoIdCustom
         * @param estado Filtrar por estado (pode repetir ?estado=...)
         * @param limit Limite (1-200)
         * @returns WorklistResponse
         * @throws ApiError
         */
        public static v1IntegracoesEquipamentosWorklistRetrieve(
            xIntegrationKey: string,
            equipamentoIdCustom: string,
            estado?: Array<string>,
            limit?: number,
        ): CancelablePromise<WorklistResponse> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/integracoes/equipamentos/{equipamento_id_custom}/worklist/',
                path: {
                    'equipamento_id_custom': equipamentoIdCustom,
                },
                headers: {
                    'X-Integration-Key': xIntegrationKey,
                },
                query: {
                    'estado': estado,
                    'limit': limit,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param criadoEm
         * @param dataPrevistaParto
         * @param estado * `ACOMP` - Em acompanhamento
         * * `PARTO` - Parto realizado
         * * `ENCERR` - Encerrada
         * * `CANCEL` - Cancelada
         * @param medicoResponsavel
         * @param ordering Qual campo usar ao ordenar os resultados.
         * @param paciente
         * @param search Um termo de busca.
         * @returns Gestacao
         * @throws ApiError
         */
        public static v1MaternidadeGestacaoList(
            criadoEm?: string,
            dataPrevistaParto?: string,
            estado?: 'ACOMP' | 'CANCEL' | 'ENCERR' | 'PARTO',
            medicoResponsavel?: number,
            ordering?: string,
            paciente?: number,
            search?: string,
        ): CancelablePromise<Array<Gestacao>> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/maternidade/gestacao/',
                query: {
                    'criado_em': criadoEm,
                    'data_prevista_parto': dataPrevistaParto,
                    'estado': estado,
                    'medico_responsavel': medicoResponsavel,
                    'ordering': ordering,
                    'paciente': paciente,
                    'search': search,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param requestBody
         * @returns Gestacao
         * @throws ApiError
         */
        public static v1MaternidadeGestacaoCreate(
            requestBody: GestacaoRequest,
        ): CancelablePromise<Gestacao> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/maternidade/gestacao/',
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Gestação.
         * @returns Gestacao
         * @throws ApiError
         */
        public static v1MaternidadeGestacaoRetrieve(
            id: number,
        ): CancelablePromise<Gestacao> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/maternidade/gestacao/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Gestação.
         * @param requestBody
         * @returns Gestacao
         * @throws ApiError
         */
        public static v1MaternidadeGestacaoUpdate(
            id: number,
            requestBody: GestacaoRequest,
        ): CancelablePromise<Gestacao> {
            return __request(OpenAPI, {
                method: 'PUT',
                url: '/api/v1/maternidade/gestacao/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Gestação.
         * @param requestBody
         * @returns Gestacao
         * @throws ApiError
         */
        public static v1MaternidadeGestacaoPartialUpdate(
            id: number,
            requestBody?: PatchedGestacaoRequest,
        ): CancelablePromise<Gestacao> {
            return __request(OpenAPI, {
                method: 'PATCH',
                url: '/api/v1/maternidade/gestacao/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Gestação.
         * @returns void
         * @throws ApiError
         */
        public static v1MaternidadeGestacaoDestroy(
            id: number,
        ): CancelablePromise<void> {
            return __request(OpenAPI, {
                method: 'DELETE',
                url: '/api/v1/maternidade/gestacao/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param caminho
         * @param criadoEm
         * @param exceptionClass
         * @param ordering Qual campo usar ao ordenar os resultados.
         * @param search Um termo de busca.
         * @param statusCode
         * @param usuario
         * @param viewAction
         * @param viewBasename
         * @returns ErroSistema
         * @throws ApiError
         */
        public static v1MonitoramentoErroList(
            caminho?: string,
            criadoEm?: string,
            exceptionClass?: string,
            ordering?: string,
            search?: string,
            statusCode?: number,
            usuario?: number,
            viewAction?: string,
            viewBasename?: string,
        ): CancelablePromise<Array<ErroSistema>> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/monitoramento/erro/',
                query: {
                    'caminho': caminho,
                    'criado_em': criadoEm,
                    'exception_class': exceptionClass,
                    'ordering': ordering,
                    'search': search,
                    'status_code': statusCode,
                    'usuario': usuario,
                    'view_action': viewAction,
                    'view_basename': viewBasename,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Erro do Sistema.
         * @returns ErroSistema
         * @throws ApiError
         */
        public static v1MonitoramentoErroRetrieve(
            id: number,
        ): CancelablePromise<ErroSistema> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/monitoramento/erro/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param criadoEm
         * @param notificacao
         * @param ordering Qual campo usar ao ordenar os resultados.
         * @param resposta
         * @param search Um termo de busca.
         * @param status
         * @returns LogEnvio
         * @throws ApiError
         */
        public static v1NotificacoesLogenvioList(
            criadoEm?: string,
            notificacao?: number,
            ordering?: string,
            resposta?: string,
            search?: string,
            status?: string,
        ): CancelablePromise<Array<LogEnvio>> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/notificacoes/logenvio/',
                query: {
                    'criado_em': criadoEm,
                    'notificacao': notificacao,
                    'ordering': ordering,
                    'resposta': resposta,
                    'search': search,
                    'status': status,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param requestBody
         * @returns LogEnvio
         * @throws ApiError
         */
        public static v1NotificacoesLogenvioCreate(
            requestBody: LogEnvioRequest,
        ): CancelablePromise<LogEnvio> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/notificacoes/logenvio/',
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Log de Envio.
         * @returns LogEnvio
         * @throws ApiError
         */
        public static v1NotificacoesLogenvioRetrieve(
            id: number,
        ): CancelablePromise<LogEnvio> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/notificacoes/logenvio/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Log de Envio.
         * @param requestBody
         * @returns LogEnvio
         * @throws ApiError
         */
        public static v1NotificacoesLogenvioUpdate(
            id: number,
            requestBody: LogEnvioRequest,
        ): CancelablePromise<LogEnvio> {
            return __request(OpenAPI, {
                method: 'PUT',
                url: '/api/v1/notificacoes/logenvio/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Log de Envio.
         * @param requestBody
         * @returns LogEnvio
         * @throws ApiError
         */
        public static v1NotificacoesLogenvioPartialUpdate(
            id: number,
            requestBody?: PatchedLogEnvioRequest,
        ): CancelablePromise<LogEnvio> {
            return __request(OpenAPI, {
                method: 'PATCH',
                url: '/api/v1/notificacoes/logenvio/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Log de Envio.
         * @returns void
         * @throws ApiError
         */
        public static v1NotificacoesLogenvioDestroy(
            id: number,
        ): CancelablePromise<void> {
            return __request(OpenAPI, {
                method: 'DELETE',
                url: '/api/v1/notificacoes/logenvio/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param canal * `email` - E-mail
         * * `sms` - SMS
         * * `whatsapp` - WhatsApp
         * @param criadoEm
         * @param destinatario
         * @param enviada
         * @param mensagem
         * @param ordering Qual campo usar ao ordenar os resultados.
         * @param search Um termo de busca.
         * @returns Notificacao
         * @throws ApiError
         */
        public static v1NotificacoesNotificacaoList(
            canal?: 'email' | 'sms' | 'whatsapp',
            criadoEm?: string,
            destinatario?: string,
            enviada?: boolean,
            mensagem?: string,
            ordering?: string,
            search?: string,
        ): CancelablePromise<Array<Notificacao>> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/notificacoes/notificacao/',
                query: {
                    'canal': canal,
                    'criado_em': criadoEm,
                    'destinatario': destinatario,
                    'enviada': enviada,
                    'mensagem': mensagem,
                    'ordering': ordering,
                    'search': search,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param requestBody
         * @returns Notificacao
         * @throws ApiError
         */
        public static v1NotificacoesNotificacaoCreate(
            requestBody: NotificacaoRequest,
        ): CancelablePromise<Notificacao> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/notificacoes/notificacao/',
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este notificacao.
         * @returns Notificacao
         * @throws ApiError
         */
        public static v1NotificacoesNotificacaoRetrieve(
            id: number,
        ): CancelablePromise<Notificacao> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/notificacoes/notificacao/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este notificacao.
         * @param requestBody
         * @returns Notificacao
         * @throws ApiError
         */
        public static v1NotificacoesNotificacaoUpdate(
            id: number,
            requestBody: NotificacaoRequest,
        ): CancelablePromise<Notificacao> {
            return __request(OpenAPI, {
                method: 'PUT',
                url: '/api/v1/notificacoes/notificacao/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este notificacao.
         * @param requestBody
         * @returns Notificacao
         * @throws ApiError
         */
        public static v1NotificacoesNotificacaoPartialUpdate(
            id: number,
            requestBody?: PatchedNotificacaoRequest,
        ): CancelablePromise<Notificacao> {
            return __request(OpenAPI, {
                method: 'PATCH',
                url: '/api/v1/notificacoes/notificacao/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este notificacao.
         * @returns void
         * @throws ApiError
         */
        public static v1NotificacoesNotificacaoDestroy(
            id: number,
        ): CancelablePromise<void> {
            return __request(OpenAPI, {
                method: 'DELETE',
                url: '/api/v1/notificacoes/notificacao/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param atualizadoEm
         * @param atualizadoPor
         * @param criadoEm
         * @param criadoPor
         * @param deletado
         * @param deletadoEm
         * @param fatura
         * @param idCustom
         * @param inquilino
         * @param metodo * `DIN` - Dinheiro
         * * `CAR` - Cartão
         * * `TRF` - Transferência
         * * `MOB` - Mobile Money
         * * `POS` - POS
         * * `CHQ` - Cheque
         * * `OUT` - Outro
         * @param nome
         * @param ordering Qual campo usar ao ordenar os resultados.
         * @param pagoEm
         * @param referenciaExterna
         * @param search Um termo de busca.
         * @param status * `PEN` - Pendente
         * * `CON` - Confirmado
         * * `FAL` - Falhou
         * * `EST` - Estornado
         * * `CAN` - Cancelado
         * @param valor
         * @returns Pagamento
         * @throws ApiError
         */
        public static v1PagamentosPagamentoList(
            atualizadoEm?: string,
            atualizadoPor?: number,
            criadoEm?: string,
            criadoPor?: number,
            deletado?: boolean,
            deletadoEm?: string,
            fatura?: number,
            idCustom?: string,
            inquilino?: number,
            metodo?: 'CAR' | 'CHQ' | 'DIN' | 'MOB' | 'OUT' | 'POS' | 'TRF',
            nome?: string,
            ordering?: string,
            pagoEm?: string,
            referenciaExterna?: string,
            search?: string,
            status?: 'CAN' | 'CON' | 'EST' | 'FAL' | 'PEN',
            valor?: number,
        ): CancelablePromise<Array<Pagamento>> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/pagamentos/pagamento/',
                query: {
                    'atualizado_em': atualizadoEm,
                    'atualizado_por': atualizadoPor,
                    'criado_em': criadoEm,
                    'criado_por': criadoPor,
                    'deletado': deletado,
                    'deletado_em': deletadoEm,
                    'fatura': fatura,
                    'id_custom': idCustom,
                    'inquilino': inquilino,
                    'metodo': metodo,
                    'nome': nome,
                    'ordering': ordering,
                    'pago_em': pagoEm,
                    'referencia_externa': referenciaExterna,
                    'search': search,
                    'status': status,
                    'valor': valor,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param requestBody
         * @returns Pagamento
         * @throws ApiError
         */
        public static v1PagamentosPagamentoCreate(
            requestBody: PagamentoRequest,
        ): CancelablePromise<Pagamento> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/pagamentos/pagamento/',
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este pagamento.
         * @returns Pagamento
         * @throws ApiError
         */
        public static v1PagamentosPagamentoRetrieve(
            id: number,
        ): CancelablePromise<Pagamento> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/pagamentos/pagamento/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este pagamento.
         * @param requestBody
         * @returns Pagamento
         * @throws ApiError
         */
        public static v1PagamentosPagamentoUpdate(
            id: number,
            requestBody: PagamentoRequest,
        ): CancelablePromise<Pagamento> {
            return __request(OpenAPI, {
                method: 'PUT',
                url: '/api/v1/pagamentos/pagamento/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este pagamento.
         * @param requestBody
         * @returns Pagamento
         * @throws ApiError
         */
        public static v1PagamentosPagamentoPartialUpdate(
            id: number,
            requestBody?: PatchedPagamentoRequest,
        ): CancelablePromise<Pagamento> {
            return __request(OpenAPI, {
                method: 'PATCH',
                url: '/api/v1/pagamentos/pagamento/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este pagamento.
         * @returns void
         * @throws ApiError
         */
        public static v1PagamentosPagamentoDestroy(
            id: number,
        ): CancelablePromise<void> {
            return __request(OpenAPI, {
                method: 'DELETE',
                url: '/api/v1/pagamentos/pagamento/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param criadoEm
         * @param fatura
         * @param numero
         * @param ordering Qual campo usar ao ordenar os resultados.
         * @param pagamento
         * @param search Um termo de busca.
         * @param valor
         * @returns Recibo
         * @throws ApiError
         */
        public static v1PagamentosReciboList(
            criadoEm?: string,
            fatura?: number,
            numero?: string,
            ordering?: string,
            pagamento?: number,
            search?: string,
            valor?: number,
        ): CancelablePromise<Array<Recibo>> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/pagamentos/recibo/',
                query: {
                    'criado_em': criadoEm,
                    'fatura': fatura,
                    'numero': numero,
                    'ordering': ordering,
                    'pagamento': pagamento,
                    'search': search,
                    'valor': valor,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param requestBody
         * @returns Recibo
         * @throws ApiError
         */
        public static v1PagamentosReciboCreate(
            requestBody: ReciboRequest,
        ): CancelablePromise<Recibo> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/pagamentos/recibo/',
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Recibo.
         * @returns Recibo
         * @throws ApiError
         */
        public static v1PagamentosReciboRetrieve(
            id: number,
        ): CancelablePromise<Recibo> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/pagamentos/recibo/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Recibo.
         * @param requestBody
         * @returns Recibo
         * @throws ApiError
         */
        public static v1PagamentosReciboUpdate(
            id: number,
            requestBody: ReciboRequest,
        ): CancelablePromise<Recibo> {
            return __request(OpenAPI, {
                method: 'PUT',
                url: '/api/v1/pagamentos/recibo/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Recibo.
         * @param requestBody
         * @returns Recibo
         * @throws ApiError
         */
        public static v1PagamentosReciboPartialUpdate(
            id: number,
            requestBody?: PatchedReciboRequest,
        ): CancelablePromise<Recibo> {
            return __request(OpenAPI, {
                method: 'PATCH',
                url: '/api/v1/pagamentos/recibo/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Recibo.
         * @returns void
         * @throws ApiError
         */
        public static v1PagamentosReciboDestroy(
            id: number,
        ): CancelablePromise<void> {
            return __request(OpenAPI, {
                method: 'DELETE',
                url: '/api/v1/pagamentos/recibo/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Recibo.
         * @returns Recibo
         * @throws ApiError
         */
        public static v1PagamentosReciboPdfRetrieve(
            id: number,
        ): CancelablePromise<Recibo> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/pagamentos/recibo/{id}/pdf/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param confirmado
         * @param criadoEm
         * @param dataConfirmacao
         * @param ordering Qual campo usar ao ordenar os resultados.
         * @param search Um termo de busca.
         * @param transacao
         * @returns Reconciliacao
         * @throws ApiError
         */
        public static v1PagamentosReconciliacaoList(
            confirmado?: boolean,
            criadoEm?: string,
            dataConfirmacao?: string,
            ordering?: string,
            search?: string,
            transacao?: number,
        ): CancelablePromise<Array<Reconciliacao>> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/pagamentos/reconciliacao/',
                query: {
                    'confirmado': confirmado,
                    'criado_em': criadoEm,
                    'data_confirmacao': dataConfirmacao,
                    'ordering': ordering,
                    'search': search,
                    'transacao': transacao,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param requestBody
         * @returns Reconciliacao
         * @throws ApiError
         */
        public static v1PagamentosReconciliacaoCreate(
            requestBody: ReconciliacaoRequest,
        ): CancelablePromise<Reconciliacao> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/pagamentos/reconciliacao/',
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Reconciliação.
         * @returns Reconciliacao
         * @throws ApiError
         */
        public static v1PagamentosReconciliacaoRetrieve(
            id: number,
        ): CancelablePromise<Reconciliacao> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/pagamentos/reconciliacao/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Reconciliação.
         * @param requestBody
         * @returns Reconciliacao
         * @throws ApiError
         */
        public static v1PagamentosReconciliacaoUpdate(
            id: number,
            requestBody: ReconciliacaoRequest,
        ): CancelablePromise<Reconciliacao> {
            return __request(OpenAPI, {
                method: 'PUT',
                url: '/api/v1/pagamentos/reconciliacao/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Reconciliação.
         * @param requestBody
         * @returns Reconciliacao
         * @throws ApiError
         */
        public static v1PagamentosReconciliacaoPartialUpdate(
            id: number,
            requestBody?: PatchedReconciliacaoRequest,
        ): CancelablePromise<Reconciliacao> {
            return __request(OpenAPI, {
                method: 'PATCH',
                url: '/api/v1/pagamentos/reconciliacao/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Reconciliação.
         * @returns void
         * @throws ApiError
         */
        public static v1PagamentosReconciliacaoDestroy(
            id: number,
        ): CancelablePromise<void> {
            return __request(OpenAPI, {
                method: 'DELETE',
                url: '/api/v1/pagamentos/reconciliacao/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param criadoEm
         * @param gateway
         * @param ordering Qual campo usar ao ordenar os resultados.
         * @param referenciaExterna
         * @param search Um termo de busca.
         * @param status
         * @returns Transacao
         * @throws ApiError
         */
        public static v1PagamentosTransacaoList(
            criadoEm?: string,
            gateway?: string,
            ordering?: string,
            referenciaExterna?: string,
            search?: string,
            status?: string,
        ): CancelablePromise<Array<Transacao>> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/pagamentos/transacao/',
                query: {
                    'criado_em': criadoEm,
                    'gateway': gateway,
                    'ordering': ordering,
                    'referencia_externa': referenciaExterna,
                    'search': search,
                    'status': status,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param requestBody
         * @returns Transacao
         * @throws ApiError
         */
        public static v1PagamentosTransacaoCreate(
            requestBody: TransacaoRequest,
        ): CancelablePromise<Transacao> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/pagamentos/transacao/',
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Transação.
         * @returns Transacao
         * @throws ApiError
         */
        public static v1PagamentosTransacaoRetrieve(
            id: number,
        ): CancelablePromise<Transacao> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/pagamentos/transacao/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Transação.
         * @param requestBody
         * @returns Transacao
         * @throws ApiError
         */
        public static v1PagamentosTransacaoUpdate(
            id: number,
            requestBody: TransacaoRequest,
        ): CancelablePromise<Transacao> {
            return __request(OpenAPI, {
                method: 'PUT',
                url: '/api/v1/pagamentos/transacao/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Transação.
         * @param requestBody
         * @returns Transacao
         * @throws ApiError
         */
        public static v1PagamentosTransacaoPartialUpdate(
            id: number,
            requestBody?: PatchedTransacaoRequest,
        ): CancelablePromise<Transacao> {
            return __request(OpenAPI, {
                method: 'PATCH',
                url: '/api/v1/pagamentos/transacao/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Transação.
         * @returns void
         * @throws ApiError
         */
        public static v1PagamentosTransacaoDestroy(
            id: number,
        ): CancelablePromise<void> {
            return __request(OpenAPI, {
                method: 'DELETE',
                url: '/api/v1/pagamentos/transacao/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param criadoEm
         * @param dosagemUnidade * `MG` - mg
         * * `ML` - ml
         * * `G` - g
         * * `L` - L
         * * `KG` - kg
         * @param medicacao
         * @param numeroDoses
         * @param ordering Qual campo usar ao ordenar os resultados.
         * @param registro
         * @param search Um termo de busca.
         * @returns PrescricaoItem
         * @throws ApiError
         */
        public static v1ProntuarioPrescricaoitemList(
            criadoEm?: string,
            dosagemUnidade?: 'G' | 'KG' | 'L' | 'MG' | 'ML',
            medicacao?: number,
            numeroDoses?: number,
            ordering?: string,
            registro?: number,
            search?: string,
        ): CancelablePromise<Array<PrescricaoItem>> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/prontuario/prescricaoitem/',
                query: {
                    'criado_em': criadoEm,
                    'dosagem_unidade': dosagemUnidade,
                    'medicacao': medicacao,
                    'numero_doses': numeroDoses,
                    'ordering': ordering,
                    'registro': registro,
                    'search': search,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param requestBody
         * @returns PrescricaoItem
         * @throws ApiError
         */
        public static v1ProntuarioPrescricaoitemCreate(
            requestBody: PrescricaoItemRequest,
        ): CancelablePromise<PrescricaoItem> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/prontuario/prescricaoitem/',
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Item de Prescrição.
         * @returns PrescricaoItem
         * @throws ApiError
         */
        public static v1ProntuarioPrescricaoitemRetrieve(
            id: number,
        ): CancelablePromise<PrescricaoItem> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/prontuario/prescricaoitem/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Item de Prescrição.
         * @param requestBody
         * @returns PrescricaoItem
         * @throws ApiError
         */
        public static v1ProntuarioPrescricaoitemUpdate(
            id: number,
            requestBody: PrescricaoItemRequest,
        ): CancelablePromise<PrescricaoItem> {
            return __request(OpenAPI, {
                method: 'PUT',
                url: '/api/v1/prontuario/prescricaoitem/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Item de Prescrição.
         * @param requestBody
         * @returns PrescricaoItem
         * @throws ApiError
         */
        public static v1ProntuarioPrescricaoitemPartialUpdate(
            id: number,
            requestBody?: PatchedPrescricaoItemRequest,
        ): CancelablePromise<PrescricaoItem> {
            return __request(OpenAPI, {
                method: 'PATCH',
                url: '/api/v1/prontuario/prescricaoitem/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Item de Prescrição.
         * @returns void
         * @throws ApiError
         */
        public static v1ProntuarioPrescricaoitemDestroy(
            id: number,
        ): CancelablePromise<void> {
            return __request(OpenAPI, {
                method: 'DELETE',
                url: '/api/v1/prontuario/prescricaoitem/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param consultas
         * @param criadoEm
         * @param estado * `RASCUNHO` - Rascunho
         * * `FINALIZADO` - Finalizado
         * * `CANCELADO` - Cancelado
         * @param fimAtendimento
         * @param inicioAtendimento
         * @param medico
         * @param ordering Qual campo usar ao ordenar os resultados.
         * @param paciente
         * @param search Um termo de busca.
         * @returns RegistroProntuario
         * @throws ApiError
         */
        public static v1ProntuarioRegistroList(
            consultas?: Array<number>,
            criadoEm?: string,
            estado?: 'CANCELADO' | 'FINALIZADO' | 'RASCUNHO',
            fimAtendimento?: string,
            inicioAtendimento?: string,
            medico?: number,
            ordering?: string,
            paciente?: number,
            search?: string,
        ): CancelablePromise<Array<RegistroProntuario>> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/prontuario/registro/',
                query: {
                    'consultas': consultas,
                    'criado_em': criadoEm,
                    'estado': estado,
                    'fim_atendimento': fimAtendimento,
                    'inicio_atendimento': inicioAtendimento,
                    'medico': medico,
                    'ordering': ordering,
                    'paciente': paciente,
                    'search': search,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param requestBody
         * @returns RegistroProntuario
         * @throws ApiError
         */
        public static v1ProntuarioRegistroCreate(
            requestBody: RegistroProntuarioRequest,
        ): CancelablePromise<RegistroProntuario> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/prontuario/registro/',
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Cardex.
         * @returns RegistroProntuario
         * @throws ApiError
         */
        public static v1ProntuarioRegistroRetrieve(
            id: number,
        ): CancelablePromise<RegistroProntuario> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/prontuario/registro/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Cardex.
         * @param requestBody
         * @returns RegistroProntuario
         * @throws ApiError
         */
        public static v1ProntuarioRegistroUpdate(
            id: number,
            requestBody: RegistroProntuarioRequest,
        ): CancelablePromise<RegistroProntuario> {
            return __request(OpenAPI, {
                method: 'PUT',
                url: '/api/v1/prontuario/registro/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Cardex.
         * @param requestBody
         * @returns RegistroProntuario
         * @throws ApiError
         */
        public static v1ProntuarioRegistroPartialUpdate(
            id: number,
            requestBody?: PatchedRegistroProntuarioRequest,
        ): CancelablePromise<RegistroProntuario> {
            return __request(OpenAPI, {
                method: 'PATCH',
                url: '/api/v1/prontuario/registro/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Cardex.
         * @returns void
         * @throws ApiError
         */
        public static v1ProntuarioRegistroDestroy(
            id: number,
        ): CancelablePromise<void> {
            return __request(OpenAPI, {
                method: 'DELETE',
                url: '/api/v1/prontuario/registro/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param requestBody
         * @returns any
         * @throws ApiError
         */
        public static v1RecepcaoAtendimentoCreate(
            requestBody?: FluxoAtendimentoCreateRequest,
        ): CancelablePromise<Record<string, any>> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/recepcao/atendimento/',
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id ID do check-in
         * @returns any
         * @throws ApiError
         */
        public static v1RecepcaoAtendimentoRetrieve(
            id: number,
        ): CancelablePromise<Record<string, any>> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/recepcao/atendimento/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param atendente
         * @param chamadoEm
         * @param chegouEm
         * @param concluidoEm
         * @param criadoEm
         * @param estado * `AGUARD` - Aguardando
         * * `ATEND` - Em atendimento
         * * `REQ` - Requisição criada
         * * `FAT` - Fatura vinculada
         * * `CONC` - Concluído
         * * `CANC` - Cancelado
         * @param fatura
         * @param inquilino
         * @param ordering Qual campo usar ao ordenar os resultados.
         * @param paciente
         * @param prioridade * `URG` - Urgente
         * * `PREF` - Preferencial
         * * `NOR` - Normal
         * @param requisicao
         * @param search Um termo de busca.
         * @returns CheckinRecepcao
         * @throws ApiError
         */
        public static v1RecepcaoCheckinList(
            atendente?: number,
            chamadoEm?: string,
            chegouEm?: string,
            concluidoEm?: string,
            criadoEm?: string,
            estado?: 'AGUARD' | 'ATEND' | 'CANC' | 'CONC' | 'FAT' | 'REQ',
            fatura?: number,
            inquilino?: number,
            ordering?: string,
            paciente?: number,
            prioridade?: 'NOR' | 'PREF' | 'URG',
            requisicao?: number,
            search?: string,
        ): CancelablePromise<Array<CheckinRecepcao>> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/recepcao/checkin/',
                query: {
                    'atendente': atendente,
                    'chamado_em': chamadoEm,
                    'chegou_em': chegouEm,
                    'concluido_em': concluidoEm,
                    'criado_em': criadoEm,
                    'estado': estado,
                    'fatura': fatura,
                    'inquilino': inquilino,
                    'ordering': ordering,
                    'paciente': paciente,
                    'prioridade': prioridade,
                    'requisicao': requisicao,
                    'search': search,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param requestBody
         * @returns CheckinRecepcao
         * @throws ApiError
         */
        public static v1RecepcaoCheckinCreate(
            requestBody: CheckinRecepcaoRequest,
        ): CancelablePromise<CheckinRecepcao> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/recepcao/checkin/',
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Check-in.
         * @returns CheckinRecepcao
         * @throws ApiError
         */
        public static v1RecepcaoCheckinRetrieve(
            id: number,
        ): CancelablePromise<CheckinRecepcao> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/recepcao/checkin/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Check-in.
         * @param requestBody
         * @returns CheckinRecepcao
         * @throws ApiError
         */
        public static v1RecepcaoCheckinUpdate(
            id: number,
            requestBody: CheckinRecepcaoRequest,
        ): CancelablePromise<CheckinRecepcao> {
            return __request(OpenAPI, {
                method: 'PUT',
                url: '/api/v1/recepcao/checkin/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Check-in.
         * @param requestBody
         * @returns CheckinRecepcao
         * @throws ApiError
         */
        public static v1RecepcaoCheckinPartialUpdate(
            id: number,
            requestBody?: PatchedCheckinRecepcaoRequest,
        ): CancelablePromise<CheckinRecepcao> {
            return __request(OpenAPI, {
                method: 'PATCH',
                url: '/api/v1/recepcao/checkin/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Check-in.
         * @returns void
         * @throws ApiError
         */
        public static v1RecepcaoCheckinDestroy(
            id: number,
        ): CancelablePromise<void> {
            return __request(OpenAPI, {
                method: 'DELETE',
                url: '/api/v1/recepcao/checkin/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Check-in.
         * @returns CheckinRecepcao
         * @throws ApiError
         */
        public static v1RecepcaoCheckinAtendimentoRetrieve(
            id: number,
        ): CancelablePromise<CheckinRecepcao> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/recepcao/checkin/{id}/atendimento/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Check-in.
         * @param requestBody
         * @returns CheckinRecepcao
         * @throws ApiError
         */
        public static v1RecepcaoCheckinCancelarCreate(
            id: number,
            requestBody: CheckinRecepcaoRequest,
        ): CancelablePromise<CheckinRecepcao> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/recepcao/checkin/{id}/cancelar/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Check-in.
         * @param requestBody
         * @returns CheckinRecepcao
         * @throws ApiError
         */
        public static v1RecepcaoCheckinConcluirCreate(
            id: number,
            requestBody: CheckinRecepcaoRequest,
        ): CancelablePromise<CheckinRecepcao> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/recepcao/checkin/{id}/concluir/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Check-in.
         * @param requestBody
         * @returns CheckinRecepcao
         * @throws ApiError
         */
        public static v1RecepcaoCheckinCriarFaturaCreate(
            id: number,
            requestBody: CheckinRecepcaoRequest,
        ): CancelablePromise<CheckinRecepcao> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/recepcao/checkin/{id}/criar_fatura/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Check-in.
         * @param requestBody
         * @returns CheckinRecepcao
         * @throws ApiError
         */
        public static v1RecepcaoCheckinCriarRequisicaoCreate(
            id: number,
            requestBody: CheckinRecepcaoRequest,
        ): CancelablePromise<CheckinRecepcao> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/recepcao/checkin/{id}/criar_requisicao/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Check-in.
         * @param requestBody
         * @returns CheckinRecepcao
         * @throws ApiError
         */
        public static v1RecepcaoCheckinIniciarAtendimentoCreate(
            id: number,
            requestBody: CheckinRecepcaoRequest,
        ): CancelablePromise<CheckinRecepcao> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/recepcao/checkin/{id}/iniciar_atendimento/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Check-in.
         * @param requestBody
         * @returns CheckinRecepcao
         * @throws ApiError
         */
        public static v1RecepcaoCheckinRegistrarPagamentoCreate(
            id: number,
            requestBody: CheckinRecepcaoRequest,
        ): CancelablePromise<CheckinRecepcao> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/recepcao/checkin/{id}/registrar_pagamento/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Check-in.
         * @param requestBody
         * @returns CheckinRecepcao
         * @throws ApiError
         */
        public static v1RecepcaoCheckinVincularFaturaCreate(
            id: number,
            requestBody: CheckinRecepcaoRequest,
        ): CancelablePromise<CheckinRecepcao> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/recepcao/checkin/{id}/vincular_fatura/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Check-in.
         * @param requestBody
         * @returns CheckinRecepcao
         * @throws ApiError
         */
        public static v1RecepcaoCheckinVincularRequisicaoCreate(
            id: number,
            requestBody: CheckinRecepcaoRequest,
        ): CancelablePromise<CheckinRecepcao> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/recepcao/checkin/{id}/vincular_requisicao/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @returns any
         * @throws ApiError
         */
        public static v1RecepcaoWorkspaceRetrieve(): CancelablePromise<Record<string, any>> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/recepcao/workspace/',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param criadoEm
         * @param funcionario
         * @param ordering Qual campo usar ao ordenar os resultados.
         * @param parentesco * `CONJUGE` - Cônjuge
         * * `FILHO` - Filho(a)
         * * `PAI` - Pai/Mãe
         * * `IRMAO` - Irmão(ã)
         * * `OUTRO` - Outro
         * @param search Um termo de busca.
         * @param viveComFuncionario
         * @returns AgregadoFamiliar
         * @throws ApiError
         */
        public static v1RecursosHumanosAgregadofamiliarList(
            criadoEm?: string,
            funcionario?: number,
            ordering?: string,
            parentesco?: 'CONJUGE' | 'FILHO' | 'IRMAO' | 'OUTRO' | 'PAI',
            search?: string,
            viveComFuncionario?: boolean,
        ): CancelablePromise<Array<AgregadoFamiliar>> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/recursos_humanos/agregadofamiliar/',
                query: {
                    'criado_em': criadoEm,
                    'funcionario': funcionario,
                    'ordering': ordering,
                    'parentesco': parentesco,
                    'search': search,
                    'vive_com_funcionario': viveComFuncionario,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param requestBody
         * @returns AgregadoFamiliar
         * @throws ApiError
         */
        public static v1RecursosHumanosAgregadofamiliarCreate(
            requestBody: AgregadoFamiliarRequest,
        ): CancelablePromise<AgregadoFamiliar> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/recursos_humanos/agregadofamiliar/',
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Agregado Familiar.
         * @returns AgregadoFamiliar
         * @throws ApiError
         */
        public static v1RecursosHumanosAgregadofamiliarRetrieve(
            id: number,
        ): CancelablePromise<AgregadoFamiliar> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/recursos_humanos/agregadofamiliar/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Agregado Familiar.
         * @param requestBody
         * @returns AgregadoFamiliar
         * @throws ApiError
         */
        public static v1RecursosHumanosAgregadofamiliarUpdate(
            id: number,
            requestBody: AgregadoFamiliarRequest,
        ): CancelablePromise<AgregadoFamiliar> {
            return __request(OpenAPI, {
                method: 'PUT',
                url: '/api/v1/recursos_humanos/agregadofamiliar/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Agregado Familiar.
         * @param requestBody
         * @returns AgregadoFamiliar
         * @throws ApiError
         */
        public static v1RecursosHumanosAgregadofamiliarPartialUpdate(
            id: number,
            requestBody?: PatchedAgregadoFamiliarRequest,
        ): CancelablePromise<AgregadoFamiliar> {
            return __request(OpenAPI, {
                method: 'PATCH',
                url: '/api/v1/recursos_humanos/agregadofamiliar/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Agregado Familiar.
         * @returns void
         * @throws ApiError
         */
        public static v1RecursosHumanosAgregadofamiliarDestroy(
            id: number,
        ): CancelablePromise<void> {
            return __request(OpenAPI, {
                method: 'DELETE',
                url: '/api/v1/recursos_humanos/agregadofamiliar/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param criadoEm
         * @param nome
         * @param ordering Qual campo usar ao ordenar os resultados.
         * @param search Um termo de busca.
         * @returns Cargo
         * @throws ApiError
         */
        public static v1RecursosHumanosCargoList(
            criadoEm?: string,
            nome?: string,
            ordering?: string,
            search?: string,
        ): CancelablePromise<Array<Cargo>> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/recursos_humanos/cargo/',
                query: {
                    'criado_em': criadoEm,
                    'nome': nome,
                    'ordering': ordering,
                    'search': search,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param requestBody
         * @returns Cargo
         * @throws ApiError
         */
        public static v1RecursosHumanosCargoCreate(
            requestBody: CargoRequest,
        ): CancelablePromise<Cargo> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/recursos_humanos/cargo/',
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Cargo.
         * @returns Cargo
         * @throws ApiError
         */
        public static v1RecursosHumanosCargoRetrieve(
            id: number,
        ): CancelablePromise<Cargo> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/recursos_humanos/cargo/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Cargo.
         * @param requestBody
         * @returns Cargo
         * @throws ApiError
         */
        public static v1RecursosHumanosCargoUpdate(
            id: number,
            requestBody: CargoRequest,
        ): CancelablePromise<Cargo> {
            return __request(OpenAPI, {
                method: 'PUT',
                url: '/api/v1/recursos_humanos/cargo/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Cargo.
         * @param requestBody
         * @returns Cargo
         * @throws ApiError
         */
        public static v1RecursosHumanosCargoPartialUpdate(
            id: number,
            requestBody?: PatchedCargoRequest,
        ): CancelablePromise<Cargo> {
            return __request(OpenAPI, {
                method: 'PATCH',
                url: '/api/v1/recursos_humanos/cargo/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Cargo.
         * @returns void
         * @throws ApiError
         */
        public static v1RecursosHumanosCargoDestroy(
            id: number,
        ): CancelablePromise<void> {
            return __request(OpenAPI, {
                method: 'DELETE',
                url: '/api/v1/recursos_humanos/cargo/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param data
         * @param funcionario
         * @param ordering Qual campo usar ao ordenar os resultados.
         * @param search Um termo de busca.
         * @param tipo * `DEMISSAO` - Demissão
         * * `RESCISAO` - Rescisão
         * * `FIM_CONTRATO` - Fim de contrato
         * * `OUTRO` - Outro
         * @returns Dispensa
         * @throws ApiError
         */
        public static v1RecursosHumanosDispensaList(
            data?: string,
            funcionario?: number,
            ordering?: string,
            search?: string,
            tipo?: 'DEMISSAO' | 'FIM_CONTRATO' | 'OUTRO' | 'RESCISAO',
        ): CancelablePromise<Array<Dispensa>> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/recursos_humanos/dispensa/',
                query: {
                    'data': data,
                    'funcionario': funcionario,
                    'ordering': ordering,
                    'search': search,
                    'tipo': tipo,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param requestBody
         * @returns Dispensa
         * @throws ApiError
         */
        public static v1RecursosHumanosDispensaCreate(
            requestBody: DispensaRequest,
        ): CancelablePromise<Dispensa> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/recursos_humanos/dispensa/',
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Dispensa.
         * @returns Dispensa
         * @throws ApiError
         */
        public static v1RecursosHumanosDispensaRetrieve(
            id: number,
        ): CancelablePromise<Dispensa> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/recursos_humanos/dispensa/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Dispensa.
         * @param requestBody
         * @returns Dispensa
         * @throws ApiError
         */
        public static v1RecursosHumanosDispensaUpdate(
            id: number,
            requestBody: DispensaRequest,
        ): CancelablePromise<Dispensa> {
            return __request(OpenAPI, {
                method: 'PUT',
                url: '/api/v1/recursos_humanos/dispensa/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Dispensa.
         * @param requestBody
         * @returns Dispensa
         * @throws ApiError
         */
        public static v1RecursosHumanosDispensaPartialUpdate(
            id: number,
            requestBody?: PatchedDispensaRequest,
        ): CancelablePromise<Dispensa> {
            return __request(OpenAPI, {
                method: 'PATCH',
                url: '/api/v1/recursos_humanos/dispensa/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Dispensa.
         * @returns void
         * @throws ApiError
         */
        public static v1RecursosHumanosDispensaDestroy(
            id: number,
        ): CancelablePromise<void> {
            return __request(OpenAPI, {
                method: 'DELETE',
                url: '/api/v1/recursos_humanos/dispensa/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param data
         * @param funcionario
         * @param justificada
         * @param ordering Qual campo usar ao ordenar os resultados.
         * @param search Um termo de busca.
         * @returns Falta
         * @throws ApiError
         */
        public static v1RecursosHumanosFaltaList(
            data?: string,
            funcionario?: number,
            justificada?: boolean,
            ordering?: string,
            search?: string,
        ): CancelablePromise<Array<Falta>> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/recursos_humanos/falta/',
                query: {
                    'data': data,
                    'funcionario': funcionario,
                    'justificada': justificada,
                    'ordering': ordering,
                    'search': search,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param requestBody
         * @returns Falta
         * @throws ApiError
         */
        public static v1RecursosHumanosFaltaCreate(
            requestBody: FaltaRequest,
        ): CancelablePromise<Falta> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/recursos_humanos/falta/',
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Falta.
         * @returns Falta
         * @throws ApiError
         */
        public static v1RecursosHumanosFaltaRetrieve(
            id: number,
        ): CancelablePromise<Falta> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/recursos_humanos/falta/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Falta.
         * @param requestBody
         * @returns Falta
         * @throws ApiError
         */
        public static v1RecursosHumanosFaltaUpdate(
            id: number,
            requestBody: FaltaRequest,
        ): CancelablePromise<Falta> {
            return __request(OpenAPI, {
                method: 'PUT',
                url: '/api/v1/recursos_humanos/falta/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Falta.
         * @param requestBody
         * @returns Falta
         * @throws ApiError
         */
        public static v1RecursosHumanosFaltaPartialUpdate(
            id: number,
            requestBody?: PatchedFaltaRequest,
        ): CancelablePromise<Falta> {
            return __request(OpenAPI, {
                method: 'PATCH',
                url: '/api/v1/recursos_humanos/falta/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Falta.
         * @returns void
         * @throws ApiError
         */
        public static v1RecursosHumanosFaltaDestroy(
            id: number,
        ): CancelablePromise<void> {
            return __request(OpenAPI, {
                method: 'DELETE',
                url: '/api/v1/recursos_humanos/falta/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param dataInicio
         * @param estado * `SOLIC` - Solicitada
         * * `APROV` - Aprovada
         * * `GOZADA` - Gozada
         * * `CANCEL` - Cancelada
         * @param funcionario
         * @param ordering Qual campo usar ao ordenar os resultados.
         * @param search Um termo de busca.
         * @returns Ferias
         * @throws ApiError
         */
        public static v1RecursosHumanosFeriasList(
            dataInicio?: string,
            estado?: 'APROV' | 'CANCEL' | 'GOZADA' | 'SOLIC',
            funcionario?: number,
            ordering?: string,
            search?: string,
        ): CancelablePromise<Array<Ferias>> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/recursos_humanos/ferias/',
                query: {
                    'data_inicio': dataInicio,
                    'estado': estado,
                    'funcionario': funcionario,
                    'ordering': ordering,
                    'search': search,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param requestBody
         * @returns Ferias
         * @throws ApiError
         */
        public static v1RecursosHumanosFeriasCreate(
            requestBody: FeriasRequest,
        ): CancelablePromise<Ferias> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/recursos_humanos/ferias/',
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Férias.
         * @returns Ferias
         * @throws ApiError
         */
        public static v1RecursosHumanosFeriasRetrieve(
            id: number,
        ): CancelablePromise<Ferias> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/recursos_humanos/ferias/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Férias.
         * @param requestBody
         * @returns Ferias
         * @throws ApiError
         */
        public static v1RecursosHumanosFeriasUpdate(
            id: number,
            requestBody: FeriasRequest,
        ): CancelablePromise<Ferias> {
            return __request(OpenAPI, {
                method: 'PUT',
                url: '/api/v1/recursos_humanos/ferias/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Férias.
         * @param requestBody
         * @returns Ferias
         * @throws ApiError
         */
        public static v1RecursosHumanosFeriasPartialUpdate(
            id: number,
            requestBody?: PatchedFeriasRequest,
        ): CancelablePromise<Ferias> {
            return __request(OpenAPI, {
                method: 'PATCH',
                url: '/api/v1/recursos_humanos/ferias/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Férias.
         * @returns void
         * @throws ApiError
         */
        public static v1RecursosHumanosFeriasDestroy(
            id: number,
        ): CancelablePromise<void> {
            return __request(OpenAPI, {
                method: 'DELETE',
                url: '/api/v1/recursos_humanos/ferias/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param ano
         * @param fechado
         * @param funcionario
         * @param mes
         * @param ordering Qual campo usar ao ordenar os resultados.
         * @param search Um termo de busca.
         * @returns FolhaPagamento
         * @throws ApiError
         */
        public static v1RecursosHumanosFolhapagamentoList(
            ano?: number,
            fechado?: boolean,
            funcionario?: number,
            mes?: number,
            ordering?: string,
            search?: string,
        ): CancelablePromise<Array<FolhaPagamento>> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/recursos_humanos/folhapagamento/',
                query: {
                    'ano': ano,
                    'fechado': fechado,
                    'funcionario': funcionario,
                    'mes': mes,
                    'ordering': ordering,
                    'search': search,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param requestBody
         * @returns FolhaPagamento
         * @throws ApiError
         */
        public static v1RecursosHumanosFolhapagamentoCreate(
            requestBody: FolhaPagamentoRequest,
        ): CancelablePromise<FolhaPagamento> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/recursos_humanos/folhapagamento/',
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Folha de Pagamento.
         * @returns FolhaPagamento
         * @throws ApiError
         */
        public static v1RecursosHumanosFolhapagamentoRetrieve(
            id: number,
        ): CancelablePromise<FolhaPagamento> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/recursos_humanos/folhapagamento/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Folha de Pagamento.
         * @param requestBody
         * @returns FolhaPagamento
         * @throws ApiError
         */
        public static v1RecursosHumanosFolhapagamentoUpdate(
            id: number,
            requestBody: FolhaPagamentoRequest,
        ): CancelablePromise<FolhaPagamento> {
            return __request(OpenAPI, {
                method: 'PUT',
                url: '/api/v1/recursos_humanos/folhapagamento/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Folha de Pagamento.
         * @param requestBody
         * @returns FolhaPagamento
         * @throws ApiError
         */
        public static v1RecursosHumanosFolhapagamentoPartialUpdate(
            id: number,
            requestBody?: PatchedFolhaPagamentoRequest,
        ): CancelablePromise<FolhaPagamento> {
            return __request(OpenAPI, {
                method: 'PATCH',
                url: '/api/v1/recursos_humanos/folhapagamento/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Folha de Pagamento.
         * @returns void
         * @throws ApiError
         */
        public static v1RecursosHumanosFolhapagamentoDestroy(
            id: number,
        ): CancelablePromise<void> {
            return __request(OpenAPI, {
                method: 'DELETE',
                url: '/api/v1/recursos_humanos/folhapagamento/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param cargo
         * @param criadoEm
         * @param dataAdmissao
         * @param estado * `ATIVO` - Ativo
         * * `INATIVO` - Inativo
         * @param ordering Qual campo usar ao ordenar os resultados.
         * @param profissao
         * @param search Um termo de busca.
         * @returns Funcionario
         * @throws ApiError
         */
        public static v1RecursosHumanosFuncionarioList(
            cargo?: number,
            criadoEm?: string,
            dataAdmissao?: string,
            estado?: 'ATIVO' | 'INATIVO',
            ordering?: string,
            profissao?: string,
            search?: string,
        ): CancelablePromise<Array<Funcionario>> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/recursos_humanos/funcionario/',
                query: {
                    'cargo': cargo,
                    'criado_em': criadoEm,
                    'data_admissao': dataAdmissao,
                    'estado': estado,
                    'ordering': ordering,
                    'profissao': profissao,
                    'search': search,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param requestBody
         * @returns Funcionario
         * @throws ApiError
         */
        public static v1RecursosHumanosFuncionarioCreate(
            requestBody: FuncionarioRequest,
        ): CancelablePromise<Funcionario> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/recursos_humanos/funcionario/',
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Funcionário.
         * @returns Funcionario
         * @throws ApiError
         */
        public static v1RecursosHumanosFuncionarioRetrieve(
            id: number,
        ): CancelablePromise<Funcionario> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/recursos_humanos/funcionario/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Funcionário.
         * @param requestBody
         * @returns Funcionario
         * @throws ApiError
         */
        public static v1RecursosHumanosFuncionarioUpdate(
            id: number,
            requestBody: FuncionarioRequest,
        ): CancelablePromise<Funcionario> {
            return __request(OpenAPI, {
                method: 'PUT',
                url: '/api/v1/recursos_humanos/funcionario/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Funcionário.
         * @param requestBody
         * @returns Funcionario
         * @throws ApiError
         */
        public static v1RecursosHumanosFuncionarioPartialUpdate(
            id: number,
            requestBody?: PatchedFuncionarioRequest,
        ): CancelablePromise<Funcionario> {
            return __request(OpenAPI, {
                method: 'PATCH',
                url: '/api/v1/recursos_humanos/funcionario/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Funcionário.
         * @returns void
         * @throws ApiError
         */
        public static v1RecursosHumanosFuncionarioDestroy(
            id: number,
        ): CancelablePromise<void> {
            return __request(OpenAPI, {
                method: 'DELETE',
                url: '/api/v1/recursos_humanos/funcionario/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param data
         * @param funcionario
         * @param ordering Qual campo usar ao ordenar os resultados.
         * @param search Um termo de busca.
         * @returns HoraExtra
         * @throws ApiError
         */
        public static v1RecursosHumanosHoraextraList(
            data?: string,
            funcionario?: number,
            ordering?: string,
            search?: string,
        ): CancelablePromise<Array<HoraExtra>> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/recursos_humanos/horaextra/',
                query: {
                    'data': data,
                    'funcionario': funcionario,
                    'ordering': ordering,
                    'search': search,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param requestBody
         * @returns HoraExtra
         * @throws ApiError
         */
        public static v1RecursosHumanosHoraextraCreate(
            requestBody: HoraExtraRequest,
        ): CancelablePromise<HoraExtra> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/recursos_humanos/horaextra/',
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Hora Extra.
         * @returns HoraExtra
         * @throws ApiError
         */
        public static v1RecursosHumanosHoraextraRetrieve(
            id: number,
        ): CancelablePromise<HoraExtra> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/recursos_humanos/horaextra/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Hora Extra.
         * @param requestBody
         * @returns HoraExtra
         * @throws ApiError
         */
        public static v1RecursosHumanosHoraextraUpdate(
            id: number,
            requestBody: HoraExtraRequest,
        ): CancelablePromise<HoraExtra> {
            return __request(OpenAPI, {
                method: 'PUT',
                url: '/api/v1/recursos_humanos/horaextra/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Hora Extra.
         * @param requestBody
         * @returns HoraExtra
         * @throws ApiError
         */
        public static v1RecursosHumanosHoraextraPartialUpdate(
            id: number,
            requestBody?: PatchedHoraExtraRequest,
        ): CancelablePromise<HoraExtra> {
            return __request(OpenAPI, {
                method: 'PATCH',
                url: '/api/v1/recursos_humanos/horaextra/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Hora Extra.
         * @returns void
         * @throws ApiError
         */
        public static v1RecursosHumanosHoraextraDestroy(
            id: number,
        ): CancelablePromise<void> {
            return __request(OpenAPI, {
                method: 'DELETE',
                url: '/api/v1/recursos_humanos/horaextra/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param ativo
         * @param diaSemana * `0` - Segunda
         * * `1` - Terça
         * * `2` - Quarta
         * * `3` - Quinta
         * * `4` - Sexta
         * * `5` - Sábado
         * * `6` - Domingo
         * @param funcionario
         * @param ordering Qual campo usar ao ordenar os resultados.
         * @param search Um termo de busca.
         * @returns HorarioTrabalho
         * @throws ApiError
         */
        public static v1RecursosHumanosHorarioList(
            ativo?: boolean,
            diaSemana?: 0 | 1 | 2 | 3 | 4 | 5 | 6,
            funcionario?: number,
            ordering?: string,
            search?: string,
        ): CancelablePromise<Array<HorarioTrabalho>> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/recursos_humanos/horario/',
                query: {
                    'ativo': ativo,
                    'dia_semana': diaSemana,
                    'funcionario': funcionario,
                    'ordering': ordering,
                    'search': search,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param requestBody
         * @returns HorarioTrabalho
         * @throws ApiError
         */
        public static v1RecursosHumanosHorarioCreate(
            requestBody: HorarioTrabalhoRequest,
        ): CancelablePromise<HorarioTrabalho> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/recursos_humanos/horario/',
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Horário de Trabalho.
         * @returns HorarioTrabalho
         * @throws ApiError
         */
        public static v1RecursosHumanosHorarioRetrieve(
            id: number,
        ): CancelablePromise<HorarioTrabalho> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/recursos_humanos/horario/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Horário de Trabalho.
         * @param requestBody
         * @returns HorarioTrabalho
         * @throws ApiError
         */
        public static v1RecursosHumanosHorarioUpdate(
            id: number,
            requestBody: HorarioTrabalhoRequest,
        ): CancelablePromise<HorarioTrabalho> {
            return __request(OpenAPI, {
                method: 'PUT',
                url: '/api/v1/recursos_humanos/horario/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Horário de Trabalho.
         * @param requestBody
         * @returns HorarioTrabalho
         * @throws ApiError
         */
        public static v1RecursosHumanosHorarioPartialUpdate(
            id: number,
            requestBody?: PatchedHorarioTrabalhoRequest,
        ): CancelablePromise<HorarioTrabalho> {
            return __request(OpenAPI, {
                method: 'PATCH',
                url: '/api/v1/recursos_humanos/horario/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Horário de Trabalho.
         * @returns void
         * @throws ApiError
         */
        public static v1RecursosHumanosHorarioDestroy(
            id: number,
        ): CancelablePromise<void> {
            return __request(OpenAPI, {
                method: 'DELETE',
                url: '/api/v1/recursos_humanos/horario/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param ativo
         * @param atualizadoEm
         * @param atualizadoPor
         * @param codigoAutorizacao
         * @param criadoEm
         * @param criadoPor
         * @param dataResposta
         * @param deletado
         * @param deletadoEm
         * @param descricao
         * @param idCustom
         * @param inquilino
         * @param nome
         * @param ordem
         * @param ordering Qual campo usar ao ordenar os resultados.
         * @param plano
         * @param requisicaoId
         * @param search Um termo de busca.
         * @param status * `PENDENTE` - Pendente
         * * `APROVADA` - Aprovada
         * * `NEGADA` - Negada
         * @returns AutorizacaoProcedimento
         * @throws ApiError
         */
        public static v1SeguradoraAutorizacaoprocedimentoList(
            ativo?: boolean,
            atualizadoEm?: string,
            atualizadoPor?: number,
            codigoAutorizacao?: string,
            criadoEm?: string,
            criadoPor?: number,
            dataResposta?: string,
            deletado?: boolean,
            deletadoEm?: string,
            descricao?: string,
            idCustom?: string,
            inquilino?: number,
            nome?: string,
            ordem?: number,
            ordering?: string,
            plano?: number,
            requisicaoId?: string,
            search?: string,
            status?: 'APROVADA' | 'NEGADA' | 'PENDENTE',
        ): CancelablePromise<Array<AutorizacaoProcedimento>> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/seguradora/autorizacaoprocedimento/',
                query: {
                    'ativo': ativo,
                    'atualizado_em': atualizadoEm,
                    'atualizado_por': atualizadoPor,
                    'codigo_autorizacao': codigoAutorizacao,
                    'criado_em': criadoEm,
                    'criado_por': criadoPor,
                    'data_resposta': dataResposta,
                    'deletado': deletado,
                    'deletado_em': deletadoEm,
                    'descricao': descricao,
                    'id_custom': idCustom,
                    'inquilino': inquilino,
                    'nome': nome,
                    'ordem': ordem,
                    'ordering': ordering,
                    'plano': plano,
                    'requisicao_id': requisicaoId,
                    'search': search,
                    'status': status,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param requestBody
         * @returns AutorizacaoProcedimento
         * @throws ApiError
         */
        public static v1SeguradoraAutorizacaoprocedimentoCreate(
            requestBody: AutorizacaoProcedimentoRequest,
        ): CancelablePromise<AutorizacaoProcedimento> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/seguradora/autorizacaoprocedimento/',
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Autorização de Procedimento.
         * @returns AutorizacaoProcedimento
         * @throws ApiError
         */
        public static v1SeguradoraAutorizacaoprocedimentoRetrieve(
            id: number,
        ): CancelablePromise<AutorizacaoProcedimento> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/seguradora/autorizacaoprocedimento/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Autorização de Procedimento.
         * @param requestBody
         * @returns AutorizacaoProcedimento
         * @throws ApiError
         */
        public static v1SeguradoraAutorizacaoprocedimentoUpdate(
            id: number,
            requestBody: AutorizacaoProcedimentoRequest,
        ): CancelablePromise<AutorizacaoProcedimento> {
            return __request(OpenAPI, {
                method: 'PUT',
                url: '/api/v1/seguradora/autorizacaoprocedimento/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Autorização de Procedimento.
         * @param requestBody
         * @returns AutorizacaoProcedimento
         * @throws ApiError
         */
        public static v1SeguradoraAutorizacaoprocedimentoPartialUpdate(
            id: number,
            requestBody?: PatchedAutorizacaoProcedimentoRequest,
        ): CancelablePromise<AutorizacaoProcedimento> {
            return __request(OpenAPI, {
                method: 'PATCH',
                url: '/api/v1/seguradora/autorizacaoprocedimento/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Autorização de Procedimento.
         * @returns void
         * @throws ApiError
         */
        public static v1SeguradoraAutorizacaoprocedimentoDestroy(
            id: number,
        ): CancelablePromise<void> {
            return __request(OpenAPI, {
                method: 'DELETE',
                url: '/api/v1/seguradora/autorizacaoprocedimento/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param ativo
         * @param atualizadoEm
         * @param atualizadoPor
         * @param criadoEm
         * @param criadoPor
         * @param deletado
         * @param deletadoEm
         * @param descricao
         * @param exigeAutorizacao
         * @param idCustom
         * @param inquilino
         * @param nome
         * @param ordem
         * @param ordering Qual campo usar ao ordenar os resultados.
         * @param percentualCobertura
         * @param search Um termo de busca.
         * @param seguradora
         * @returns PlanoCobertura
         * @throws ApiError
         */
        public static v1SeguradoraPlanocoberturaList(
            ativo?: boolean,
            atualizadoEm?: string,
            atualizadoPor?: number,
            criadoEm?: string,
            criadoPor?: number,
            deletado?: boolean,
            deletadoEm?: string,
            descricao?: string,
            exigeAutorizacao?: boolean,
            idCustom?: string,
            inquilino?: number,
            nome?: string,
            ordem?: number,
            ordering?: string,
            percentualCobertura?: number,
            search?: string,
            seguradora?: number,
        ): CancelablePromise<Array<PlanoCobertura>> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/seguradora/planocobertura/',
                query: {
                    'ativo': ativo,
                    'atualizado_em': atualizadoEm,
                    'atualizado_por': atualizadoPor,
                    'criado_em': criadoEm,
                    'criado_por': criadoPor,
                    'deletado': deletado,
                    'deletado_em': deletadoEm,
                    'descricao': descricao,
                    'exige_autorizacao': exigeAutorizacao,
                    'id_custom': idCustom,
                    'inquilino': inquilino,
                    'nome': nome,
                    'ordem': ordem,
                    'ordering': ordering,
                    'percentual_cobertura': percentualCobertura,
                    'search': search,
                    'seguradora': seguradora,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param requestBody
         * @returns PlanoCobertura
         * @throws ApiError
         */
        public static v1SeguradoraPlanocoberturaCreate(
            requestBody: PlanoCoberturaRequest,
        ): CancelablePromise<PlanoCobertura> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/seguradora/planocobertura/',
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Plano de Cobertura.
         * @returns PlanoCobertura
         * @throws ApiError
         */
        public static v1SeguradoraPlanocoberturaRetrieve(
            id: number,
        ): CancelablePromise<PlanoCobertura> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/seguradora/planocobertura/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Plano de Cobertura.
         * @param requestBody
         * @returns PlanoCobertura
         * @throws ApiError
         */
        public static v1SeguradoraPlanocoberturaUpdate(
            id: number,
            requestBody: PlanoCoberturaRequest,
        ): CancelablePromise<PlanoCobertura> {
            return __request(OpenAPI, {
                method: 'PUT',
                url: '/api/v1/seguradora/planocobertura/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Plano de Cobertura.
         * @param requestBody
         * @returns PlanoCobertura
         * @throws ApiError
         */
        public static v1SeguradoraPlanocoberturaPartialUpdate(
            id: number,
            requestBody?: PatchedPlanoCoberturaRequest,
        ): CancelablePromise<PlanoCobertura> {
            return __request(OpenAPI, {
                method: 'PATCH',
                url: '/api/v1/seguradora/planocobertura/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Plano de Cobertura.
         * @returns void
         * @throws ApiError
         */
        public static v1SeguradoraPlanocoberturaDestroy(
            id: number,
        ): CancelablePromise<void> {
            return __request(OpenAPI, {
                method: 'DELETE',
                url: '/api/v1/seguradora/planocobertura/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param ativa
         * @param ativo
         * @param atualizadoEm
         * @param atualizadoPor
         * @param codigoExterno
         * @param criadoEm
         * @param criadoPor
         * @param deletado
         * @param deletadoEm
         * @param descricao
         * @param email
         * @param idCustom
         * @param inquilino
         * @param nome
         * @param ordem
         * @param ordering Qual campo usar ao ordenar os resultados.
         * @param search Um termo de busca.
         * @param telefone
         * @returns Seguradora
         * @throws ApiError
         */
        public static v1SeguradoraSeguradoraList(
            ativa?: boolean,
            ativo?: boolean,
            atualizadoEm?: string,
            atualizadoPor?: number,
            codigoExterno?: string,
            criadoEm?: string,
            criadoPor?: number,
            deletado?: boolean,
            deletadoEm?: string,
            descricao?: string,
            email?: string,
            idCustom?: string,
            inquilino?: number,
            nome?: string,
            ordem?: number,
            ordering?: string,
            search?: string,
            telefone?: string,
        ): CancelablePromise<Array<Seguradora>> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/seguradora/seguradora/',
                query: {
                    'ativa': ativa,
                    'ativo': ativo,
                    'atualizado_em': atualizadoEm,
                    'atualizado_por': atualizadoPor,
                    'codigo_externo': codigoExterno,
                    'criado_em': criadoEm,
                    'criado_por': criadoPor,
                    'deletado': deletado,
                    'deletado_em': deletadoEm,
                    'descricao': descricao,
                    'email': email,
                    'id_custom': idCustom,
                    'inquilino': inquilino,
                    'nome': nome,
                    'ordem': ordem,
                    'ordering': ordering,
                    'search': search,
                    'telefone': telefone,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param requestBody
         * @returns Seguradora
         * @throws ApiError
         */
        public static v1SeguradoraSeguradoraCreate(
            requestBody: SeguradoraRequest,
        ): CancelablePromise<Seguradora> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/seguradora/seguradora/',
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Seguradora.
         * @returns Seguradora
         * @throws ApiError
         */
        public static v1SeguradoraSeguradoraRetrieve(
            id: number,
        ): CancelablePromise<Seguradora> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/api/v1/seguradora/seguradora/{id}/',
                path: {
                    'id': id,
                },
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Seguradora.
         * @param requestBody
         * @returns Seguradora
         * @throws ApiError
         */
        public static v1SeguradoraSeguradoraUpdate(
            id: number,
            requestBody: SeguradoraRequest,
        ): CancelablePromise<Seguradora> {
            return __request(OpenAPI, {
                method: 'PUT',
                url: '/api/v1/seguradora/seguradora/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Seguradora.
         * @param requestBody
         * @returns Seguradora
         * @throws ApiError
         */
        public static v1SeguradoraSeguradoraPartialUpdate(
            id: number,
            requestBody?: PatchedSeguradoraRequest,
        ): CancelablePromise<Seguradora> {
            return __request(OpenAPI, {
                method: 'PATCH',
                url: '/api/v1/seguradora/seguradora/{id}/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
         * `search_fields`/`ordering_fields`.
         *
         * - Remove campos invalidos (para nao quebrar em runtime).
         * - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
         * para ser inspecionada por testes/CI.
         * @param id Um valor inteiro único que identifica este Seguradora.
         * @returns void
         * @throws ApiError
         */
        public static v1SeguradoraSeguradoraDestroy(
            id: number,
        ): CancelablePromise<void> {
            return __request(OpenAPI, {
                method: 'DELETE',
                url: '/api/v1/seguradora/seguradora/{id}/',
                path: {
                    'id': id,
                },
            });
        }
    }
