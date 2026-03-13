/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AutorizacaoProcedimento } from '../models/AutorizacaoProcedimento';
import type { AutorizacaoProcedimentoRequest } from '../models/AutorizacaoProcedimentoRequest';
import type { CheckinRecepcao } from '../models/CheckinRecepcao';
import type { CheckinRecepcaoRequest } from '../models/CheckinRecepcaoRequest';
import type { ConciliacaoFinanceira } from '../models/ConciliacaoFinanceira';
import type { ConciliacaoFinanceiraRequest } from '../models/ConciliacaoFinanceiraRequest';
import type { ConfiguracaoInquilino } from '../models/ConfiguracaoInquilino';
import type { ConfiguracaoInquilinoRequest } from '../models/ConfiguracaoInquilinoRequest';
import type { Conta } from '../models/Conta';
import type { ContaRequest } from '../models/ContaRequest';
import type { EvolucaoEnfermagem } from '../models/EvolucaoEnfermagem';
import type { EvolucaoEnfermagemRequest } from '../models/EvolucaoEnfermagemRequest';
import type { Fatura } from '../models/Fatura';
import type { FaturaItem } from '../models/FaturaItem';
import type { FaturaItemRequest } from '../models/FaturaItemRequest';
import type { FaturaRequest } from '../models/FaturaRequest';
import type { FeatureFlagTenant } from '../models/FeatureFlagTenant';
import type { FeatureFlagTenantRequest } from '../models/FeatureFlagTenantRequest';
import type { HistoricoFatura } from '../models/HistoricoFatura';
import type { HistoricoFaturaRequest } from '../models/HistoricoFaturaRequest';
import type { Inquilino } from '../models/Inquilino';
import type { InquilinoRequest } from '../models/InquilinoRequest';
import type { ItemVenda } from '../models/ItemVenda';
import type { ItemVendaRequest } from '../models/ItemVendaRequest';
import type { Lancamento } from '../models/Lancamento';
import type { LancamentoRequest } from '../models/LancamentoRequest';
import type { LogEnvio } from '../models/LogEnvio';
import type { LogEnvioRequest } from '../models/LogEnvioRequest';
import type { Lote } from '../models/Lote';
import type { LoteRequest } from '../models/LoteRequest';
import type { Movimento } from '../models/Movimento';
import type { MovimentoEstoque } from '../models/MovimentoEstoque';
import type { MovimentoEstoqueRequest } from '../models/MovimentoEstoqueRequest';
import type { MovimentoRequest } from '../models/MovimentoRequest';
import type { Notificacao } from '../models/Notificacao';
import type { NotificacaoRequest } from '../models/NotificacaoRequest';
import type { Pagamento } from '../models/Pagamento';
import type { PagamentoRequest } from '../models/PagamentoRequest';
import type { PasswordResetToken } from '../models/PasswordResetToken';
import type { PasswordResetTokenRequest } from '../models/PasswordResetTokenRequest';
import type { PatchedAutorizacaoProcedimentoRequest } from '../models/PatchedAutorizacaoProcedimentoRequest';
import type { PatchedCheckinRecepcaoRequest } from '../models/PatchedCheckinRecepcaoRequest';
import type { PatchedConciliacaoFinanceiraRequest } from '../models/PatchedConciliacaoFinanceiraRequest';
import type { PatchedConfiguracaoInquilinoRequest } from '../models/PatchedConfiguracaoInquilinoRequest';
import type { PatchedContaRequest } from '../models/PatchedContaRequest';
import type { PatchedEvolucaoEnfermagemRequest } from '../models/PatchedEvolucaoEnfermagemRequest';
import type { PatchedFaturaItemRequest } from '../models/PatchedFaturaItemRequest';
import type { PatchedFaturaRequest } from '../models/PatchedFaturaRequest';
import type { PatchedFeatureFlagTenantRequest } from '../models/PatchedFeatureFlagTenantRequest';
import type { PatchedHistoricoFaturaRequest } from '../models/PatchedHistoricoFaturaRequest';
import type { PatchedInquilinoRequest } from '../models/PatchedInquilinoRequest';
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
import type { PatchedProcedimentoCatalogoMaterialRequest } from '../models/PatchedProcedimentoCatalogoMaterialRequest';
import type { PatchedProcedimentoCatalogoRequest } from '../models/PatchedProcedimentoCatalogoRequest';
import type { PatchedProcedimentoItemRequest } from '../models/PatchedProcedimentoItemRequest';
import type { PatchedProcedimentoItemValorRequest } from '../models/PatchedProcedimentoItemValorRequest';
import type { PatchedProcedimentoMaterialRequest } from '../models/PatchedProcedimentoMaterialRequest';
import type { PatchedProcedimentoMaterialValorRequest } from '../models/PatchedProcedimentoMaterialValorRequest';
import type { PatchedProcedimentoRequest } from '../models/PatchedProcedimentoRequest';
import type { PatchedProdutoRequest } from '../models/PatchedProdutoRequest';
import type { PatchedReciboRequest } from '../models/PatchedReciboRequest';
import type { PatchedReconciliacaoRequest } from '../models/PatchedReconciliacaoRequest';
import type { PatchedRegistroEnfermagemRequest } from '../models/PatchedRegistroEnfermagemRequest';
import type { PatchedSeguradoraRequest } from '../models/PatchedSeguradoraRequest';
import type { PatchedSinalVitalEnfermagemRequest } from '../models/PatchedSinalVitalEnfermagemRequest';
import type { PatchedTransacaoRequest } from '../models/PatchedTransacaoRequest';
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
import type { Procedimento } from '../models/Procedimento';
import type { ProcedimentoCatalogo } from '../models/ProcedimentoCatalogo';
import type { ProcedimentoCatalogoMaterial } from '../models/ProcedimentoCatalogoMaterial';
import type { ProcedimentoCatalogoMaterialRequest } from '../models/ProcedimentoCatalogoMaterialRequest';
import type { ProcedimentoCatalogoRequest } from '../models/ProcedimentoCatalogoRequest';
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
import type { Seguradora } from '../models/Seguradora';
import type { SeguradoraRequest } from '../models/SeguradoraRequest';
import type { SinalVitalEnfermagem } from '../models/SinalVitalEnfermagem';
import type { SinalVitalEnfermagemRequest } from '../models/SinalVitalEnfermagemRequest';
import type { TokenObtainPair } from '../models/TokenObtainPair';
import type { TokenObtainPairRequest } from '../models/TokenObtainPairRequest';
import type { TokenRefresh } from '../models/TokenRefresh';
import type { TokenRefreshRequest } from '../models/TokenRefreshRequest';
import type { Transacao } from '../models/Transacao';
import type { TransacaoRequest } from '../models/TransacaoRequest';
import type { UsoTenant } from '../models/UsoTenant';
import type { UsoTenantRequest } from '../models/UsoTenantRequest';
import type { Usuario } from '../models/Usuario';
import type { UsuarioRequest } from '../models/UsuarioRequest';
import type { Venda } from '../models/Venda';
import type { VendaRequest } from '../models/VendaRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class V1Service {
    /**
     * Takes a set of user credentials and returns an access and refresh JSON web
     * token pair to prove the authentication of those credentials.
     * @param requestBody
     * @returns TokenObtainPair
     * @throws ApiError
     */
    public static v1AuthLoginCreate(
        requestBody: TokenObtainPairRequest,
    ): CancelablePromise<TokenObtainPair> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/login/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns any No response body
     * @throws ApiError
     */
    public static v1AuthLogoutCreate(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/logout/',
        });
    }
    /**
     * Takes a refresh type JSON web token and returns an access type JSON web
     * token if the refresh token is valid.
     * @param requestBody
     * @returns TokenRefresh
     * @throws ApiError
     */
    public static v1AuthRefreshCreate(
        requestBody: TokenRefreshRequest,
    ): CancelablePromise<TokenRefresh> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/refresh/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns any No response body
     * @throws ApiError
     */
    public static v1AuthUserRetrieve(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/auth/user/',
        });
    }
    /**
     * @param conciliado
     * @param criadoEm
     * @param fatura
     * @returns ConciliacaoFinanceira
     * @throws ApiError
     */
    public static v1ContabilidadeConciliacaofinanceiraList(
        conciliado?: boolean,
        criadoEm?: string,
        fatura?: number,
    ): CancelablePromise<Array<ConciliacaoFinanceira>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/contabilidade/conciliacaofinanceira/',
            query: {
                'conciliado': conciliado,
                'criado_em': criadoEm,
                'fatura': fatura,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this conciliacao financeira.
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
     * @param id A unique integer value identifying this conciliacao financeira.
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
     * @param id A unique integer value identifying this conciliacao financeira.
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
     * @param id A unique integer value identifying this conciliacao financeira.
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
     * @param atualizadoEm
     * @param atualizadoPor
     * @param criadoEm
     * @param criadoPor
     * @param deletado
     * @param deletadoEm
     * @param idCustom
     * @param inquilino
     * @param nome
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
        tipo: 'ATI' | 'DES' | 'PAS' | 'PAT' | 'REC' = 'DES',
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
                'tipo': tipo,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this conta.
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
     * @param id A unique integer value identifying this conta.
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
     * @param id A unique integer value identifying this conta.
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
     * @param id A unique integer value identifying this conta.
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
     * @param referenciaExterna
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
        referenciaExterna?: string,
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
                'referencia_externa': referenciaExterna,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this lancamento.
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
     * @param id A unique integer value identifying this lancamento.
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
     * @param id A unique integer value identifying this lancamento.
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
     * @param id A unique integer value identifying this lancamento.
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
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this movimento.
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
     * @param id A unique integer value identifying this movimento.
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
     * @param id A unique integer value identifying this movimento.
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
     * @param id A unique integer value identifying this movimento.
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
     * @returns any No response body
     * @throws ApiError
     */
    public static v1DashboardStatsRetrieve(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/dashboard/stats/',
        });
    }
    /**
     * @param atualizadoEm
     * @param criadoEm
     * @param dataEvolucao
     * @param deletado
     * @param idCustom
     * @param inquilino
     * @param nome
     * @param paciente
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
        paciente?: number,
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
                'paciente': paciente,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this Evolução de Enfermagem.
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
     * @param id A unique integer value identifying this Evolução de Enfermagem.
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
     * @param id A unique integer value identifying this Evolução de Enfermagem.
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
     * @param id A unique integer value identifying this Evolução de Enfermagem.
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
     * @param ativo
     * @param atualizadoEm
     * @param criadoEm
     * @param dataPrescricao
     * @param deletado
     * @param idCustom
     * @param inquilino
     * @param nome
     * @param paciente
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
        paciente?: number,
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
                'paciente': paciente,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this Prescrição de Enfermagem.
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
     * @param id A unique integer value identifying this Prescrição de Enfermagem.
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
     * @param id A unique integer value identifying this Prescrição de Enfermagem.
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
     * @param id A unique integer value identifying this Prescrição de Enfermagem.
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
     * @param atualizadoEm
     * @param criadoEm
     * @param dataRealizacao
     * @param deletado
     * @param idCustom
     * @param inquilino
     * @param paciente
     * @param profissional
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
        paciente?: number,
        profissional?: number,
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
                'paciente': paciente,
                'profissional': profissional,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this Procedimento.
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
     * @param id A unique integer value identifying this Procedimento.
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
     * @param id A unique integer value identifying this Procedimento.
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
     * @param id A unique integer value identifying this Procedimento.
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
     * @param atualizadoEm
     * @param criadoEm
     * @param deletado
     * @param idCustom
     * @param inquilino
     * @param nome
     * @param precoPadrao
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
        precoPadrao?: number,
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
                'preco_padrao': precoPadrao,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this Procedimento (Catálogo).
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
     * @param id A unique integer value identifying this Procedimento (Catálogo).
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
     * @param id A unique integer value identifying this Procedimento (Catálogo).
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
     * @param id A unique integer value identifying this Procedimento (Catálogo).
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
     * @param atualizadoEm
     * @param catalogo
     * @param criadoEm
     * @param custoUnitarioPadrao
     * @param deletado
     * @param idCustom
     * @param inquilino
     * @param produto
     * @param quantidadePadrao
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
        produto?: number,
        quantidadePadrao?: number,
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
                'produto': produto,
                'quantidade_padrao': quantidadePadrao,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this Material de Procedimento.
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
     * @param id A unique integer value identifying this Material de Procedimento.
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
     * @param id A unique integer value identifying this Material de Procedimento.
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
     * @param id A unique integer value identifying this Material de Procedimento.
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
     * @param atualizadoEm
     * @param catalogo
     * @param criadoEm
     * @param deletado
     * @param descricao
     * @param idCustom
     * @param inquilino
     * @param procedimento
     * @param quantidade
     * @param realizado
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
        procedimento?: number,
        quantidade?: number,
        realizado?: boolean,
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
                'procedimento': procedimento,
                'quantidade': quantidade,
                'realizado': realizado,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this Item de Procedimento.
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
     * @param id A unique integer value identifying this Item de Procedimento.
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
     * @param id A unique integer value identifying this Item de Procedimento.
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
     * @param id A unique integer value identifying this Item de Procedimento.
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
     * @param atualizadoEm
     * @param criadoEm
     * @param deletado
     * @param idCustom
     * @param inquilino
     * @param item
     * @param precoUnitario
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
        precoUnitario?: number,
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
                'preco_unitario': precoUnitario,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this Valor do Item de Procedimento.
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
     * @param id A unique integer value identifying this Valor do Item de Procedimento.
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
     * @param id A unique integer value identifying this Valor do Item de Procedimento.
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
     * @param id A unique integer value identifying this Valor do Item de Procedimento.
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
     * @param atualizadoEm
     * @param criadoEm
     * @param deletado
     * @param idCustom
     * @param inquilino
     * @param lote
     * @param movimentoEstoque
     * @param procedimento
     * @param procedimentoItem
     * @param produto
     * @param quantidade
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
        procedimento?: number,
        procedimentoItem?: number,
        produto?: number,
        quantidade?: number,
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
                'procedimento': procedimento,
                'procedimento_item': procedimentoItem,
                'produto': produto,
                'quantidade': quantidade,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this Material do Procedimento.
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
     * @param id A unique integer value identifying this Material do Procedimento.
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
     * @param id A unique integer value identifying this Material do Procedimento.
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
     * @param id A unique integer value identifying this Material do Procedimento.
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
     * @param atualizadoEm
     * @param criadoEm
     * @param custoUnitario
     * @param deletado
     * @param idCustom
     * @param inquilino
     * @param material
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
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this Valor do Material do Procedimento.
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
     * @param id A unique integer value identifying this Valor do Material do Procedimento.
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
     * @param id A unique integer value identifying this Valor do Material do Procedimento.
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
     * @param id A unique integer value identifying this Valor do Material do Procedimento.
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
     * @param atualizadoEm
     * @param criadoEm
     * @param dataRegistro
     * @param deletado
     * @param idCustom
     * @param inquilino
     * @param nome
     * @param paciente
     * @param prioridade * `URG` - Urgente
     * * `NOR` - Normal
     * * `BAI` - Baixa
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
        paciente?: number,
        prioridade: 'BAI' | 'NOR' | 'URG' = 'NOR',
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
                'paciente': paciente,
                'prioridade': prioridade,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this Registro de Enfermagem.
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
     * @param id A unique integer value identifying this Registro de Enfermagem.
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
     * @param id A unique integer value identifying this Registro de Enfermagem.
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
     * @param id A unique integer value identifying this Registro de Enfermagem.
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
     * @param atualizadoEm
     * @param coletadoEm
     * @param criadoEm
     * @param deletado
     * @param frequenciaCardiaca
     * @param frequenciaRespiratoria
     * @param idCustom
     * @param inquilino
     * @param nome
     * @param registro
     * @param saturacaoOxigenio
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
        registro?: number,
        saturacaoOxigenio?: number,
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
                'registro': registro,
                'saturacao_oxigenio': saturacaoOxigenio,
                'temperatura_c': temperaturaC,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this Sinal Vital.
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
     * @param id A unique integer value identifying this Sinal Vital.
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
     * @param id A unique integer value identifying this Sinal Vital.
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
     * @param id A unique integer value identifying this Sinal Vital.
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
     * @param atualizadoEm
     * @param atualizadoPor
     * @param criadoEm
     * @param criadoPor
     * @param deletado
     * @param deletadoEm
     * @param idCustom
     * @param inquilino
     * @param nome
     * @param precoUnitario
     * @param produto
     * @param quantidade
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
        precoUnitario?: number,
        produto?: number,
        quantidade?: number,
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
                'preco_unitario': precoUnitario,
                'produto': produto,
                'quantidade': quantidade,
                'venda': venda,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this Item da Venda.
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
     * @param id A unique integer value identifying this Item da Venda.
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
     * @param id A unique integer value identifying this Item da Venda.
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
     * @param id A unique integer value identifying this Item da Venda.
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
     * @param produto
     * @param quantidadeInicial
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
        produto?: number,
        quantidadeInicial?: number,
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
                'produto': produto,
                'quantidade_inicial': quantidadeInicial,
                'validade': validade,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this lote.
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
     * @param id A unique integer value identifying this lote.
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
     * @param id A unique integer value identifying this lote.
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
     * @param id A unique integer value identifying this lote.
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
     * @param origem * `VEND` - Venda
     * * `PROC` - Procedimento
     * * `AJUS` - Ajuste
     * @param quantidade
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
        origem: 'AJUS' | 'PROC' | 'VEND' = 'AJUS',
        quantidade?: number,
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
                'origem': origem,
                'quantidade': quantidade,
                'tipo': tipo,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this movimento estoque.
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
     * @param id A unique integer value identifying this movimento estoque.
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
     * @param id A unique integer value identifying this movimento estoque.
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
     * @param id A unique integer value identifying this movimento estoque.
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
     * @param atualizadoEm
     * @param atualizadoPor
     * @param criadoEm
     * @param criadoPor
     * @param deletado
     * @param deletadoEm
     * @param idCustom
     * @param inquilino
     * @param nome
     * @param precoVenda
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
        precoVenda?: number,
        tipo: 'MAT' | 'MED' | 'OUT' = 'OUT',
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
                'preco_venda': precoVenda,
                'tipo': tipo,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this Produto.
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
     * @param id A unique integer value identifying this Produto.
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
     * @param id A unique integer value identifying this Produto.
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
     * @param id A unique integer value identifying this Produto.
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
     * @param atualizadoEm
     * @param atualizadoPor
     * @param criadoEm
     * @param criadoPor
     * @param deletado
     * @param deletadoEm
     * @param idCustom
     * @param inquilino
     * @param numero
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
                'total': total,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this Venda.
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
     * @param id A unique integer value identifying this Venda.
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
     * @param id A unique integer value identifying this Venda.
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
     * @param id A unique integer value identifying this Venda.
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
     * @param atualizadoEm
     * @param atualizadoPor
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
     * @param paciente
     * @param requisicao
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
        criadoEm?: string,
        criadoPor?: number,
        deletado?: boolean,
        deletadoEm?: string,
        estado: 'CANC' | 'EMIT' | 'PAGA' | 'RASC' = 'RASC',
        idCustom?: string,
        inquilino?: number,
        ivaValor?: number,
        paciente?: number,
        requisicao?: number,
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
                'criado_em': criadoEm,
                'criado_por': criadoPor,
                'deletado': deletado,
                'deletado_em': deletadoEm,
                'estado': estado,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'iva_valor': ivaValor,
                'paciente': paciente,
                'requisicao': requisicao,
                'subtotal': subtotal,
                'total': total,
                'valor_paciente': valorPaciente,
                'valor_seguro': valorSeguro,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this fatura.
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
     * @param id A unique integer value identifying this fatura.
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
     * @param id A unique integer value identifying this fatura.
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
     * @param id A unique integer value identifying this fatura.
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
     * @param id A unique integer value identifying this fatura.
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
     * @param id A unique integer value identifying this fatura.
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
     * @param id A unique integer value identifying this fatura.
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
     * @param precoUnitario
     * @param quantidade
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
        precoUnitario?: number,
        quantidade?: number,
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
                'preco_unitario': precoUnitario,
                'quantidade': quantidade,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this fatura item.
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
     * @param id A unique integer value identifying this fatura item.
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
     * @param id A unique integer value identifying this fatura item.
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
     * @param id A unique integer value identifying this fatura item.
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
     * @param criadoEm
     * @param descricao
     * @param fatura
     * @param tipoEvento
     * @returns HistoricoFatura
     * @throws ApiError
     */
    public static v1FaturamentoHistoricofaturaList(
        criadoEm?: string,
        descricao?: string,
        fatura?: number,
        tipoEvento?: string,
    ): CancelablePromise<Array<HistoricoFatura>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/faturamento/historicofatura/',
            query: {
                'criado_em': criadoEm,
                'descricao': descricao,
                'fatura': fatura,
                'tipo_evento': tipoEvento,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this Histórico de Fatura.
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
     * @param id A unique integer value identifying this Histórico de Fatura.
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
     * @param id A unique integer value identifying this Histórico de Fatura.
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
     * @param id A unique integer value identifying this Histórico de Fatura.
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
     * @param criadoEm
     * @param token
     * @param usado
     * @param user
     * @returns PasswordResetToken
     * @throws ApiError
     */
    public static v1IdentidadePasswordresettokenList(
        criadoEm?: string,
        token?: string,
        usado?: boolean,
        user?: number,
    ): CancelablePromise<Array<PasswordResetToken>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/identidade/passwordresettoken/',
            query: {
                'criado_em': criadoEm,
                'token': token,
                'usado': usado,
                'user': user,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this Token de Reset de Password.
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
     * @param id A unique integer value identifying this Token de Reset de Password.
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
     * @param id A unique integer value identifying this Token de Reset de Password.
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
     * @param id A unique integer value identifying this Token de Reset de Password.
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
     * @param ativo
     * @param atualizadoEm
     * @param cargo
     * @param criadoEm
     * @param departamento
     * @param registroProfissional
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
        registroProfissional?: string,
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
                'registro_profissional': registroProfissional,
                'usuario': usuario,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this Perfil Profissional.
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
     * @param id A unique integer value identifying this Perfil Profissional.
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
     * @param id A unique integer value identifying this Perfil Profissional.
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
     * @param id A unique integer value identifying this Perfil Profissional.
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
     * @param dateJoined
     * @param email
     * @param firstName
     * @param isActive
     * @param isStaff
     * @param isSuperuser
     * @param lastLogin
     * @param lastName
     * @param password
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
        password?: string,
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
                'password': password,
                'telefone': telefone,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this Usuário.
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
     * @param id A unique integer value identifying this Usuário.
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
     * @param id A unique integer value identifying this Usuário.
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
     * @param id A unique integer value identifying this Usuário.
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
     * @param permiteMultiUnidade
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
        permiteMultiUnidade?: boolean,
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
                'permite_multi_unidade': permiteMultiUnidade,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this Configuração do Inquilino.
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
     * @param id A unique integer value identifying this Configuração do Inquilino.
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
     * @param id A unique integer value identifying this Configuração do Inquilino.
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
     * @param id A unique integer value identifying this Configuração do Inquilino.
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
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this Feature Flag (Tenant).
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
     * @param id A unique integer value identifying this Feature Flag (Tenant).
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
     * @param id A unique integer value identifying this Feature Flag (Tenant).
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
     * @param id A unique integer value identifying this Feature Flag (Tenant).
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
        statusComercial: 'ATIVO' | 'SUSPENSO' | 'TRIAL' = 'TRIAL',
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
                'status_comercial': statusComercial,
                'trial_ate': trialAte,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this Inquilino.
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
     * @param id A unique integer value identifying this Inquilino.
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
     * @param id A unique integer value identifying this Inquilino.
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
     * @param id A unique integer value identifying this Inquilino.
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
     * @param permiteMultiUnidade
     * @param precoExcedenteRequisicao
     * @param precoMensal
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
        permiteMultiUnidade?: boolean,
        precoExcedenteRequisicao?: number,
        precoMensal?: number,
        suportePrioritario?: boolean,
        tipo: 'BASIC' | 'FREE' | 'PRO' = 'FREE',
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
                'permite_multi_unidade': permiteMultiUnidade,
                'preco_excedente_requisicao': precoExcedenteRequisicao,
                'preco_mensal': precoMensal,
                'suporte_prioritario': suportePrioritario,
                'tipo': tipo,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this Plano de Assinatura.
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
     * @param id A unique integer value identifying this Plano de Assinatura.
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
     * @param id A unique integer value identifying this Plano de Assinatura.
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
     * @param id A unique integer value identifying this Plano de Assinatura.
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
     * @param atualizadoEm
     * @param atualizadoPor
     * @param criadoEm
     * @param criadoPor
     * @param deletado
     * @param deletadoEm
     * @param idCustom
     * @param inquilino
     * @param requisicoesMesAtual
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
        requisicoesMesAtual?: number,
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
                'requisicoes_mes_atual': requisicoesMesAtual,
                'usuarios_ativos': usuariosAtivos,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this Uso do Tenant.
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
     * @param id A unique integer value identifying this Uso do Tenant.
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
     * @param id A unique integer value identifying this Uso do Tenant.
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
     * @param id A unique integer value identifying this Uso do Tenant.
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
     * @param criadoEm
     * @param notificacao
     * @param resposta
     * @param status
     * @returns LogEnvio
     * @throws ApiError
     */
    public static v1NotificacoesLogenvioList(
        criadoEm?: string,
        notificacao?: number,
        resposta?: string,
        status?: string,
    ): CancelablePromise<Array<LogEnvio>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/notificacoes/logenvio/',
            query: {
                'criado_em': criadoEm,
                'notificacao': notificacao,
                'resposta': resposta,
                'status': status,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this Log de Envio.
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
     * @param id A unique integer value identifying this Log de Envio.
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
     * @param id A unique integer value identifying this Log de Envio.
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
     * @param id A unique integer value identifying this Log de Envio.
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
     * @param canal * `email` - E-mail
     * * `sms` - SMS
     * * `whatsapp` - WhatsApp
     * @param criadoEm
     * @param destinatario
     * @param enviada
     * @param mensagem
     * @returns Notificacao
     * @throws ApiError
     */
    public static v1NotificacoesNotificacaoList(
        canal?: 'email' | 'sms' | 'whatsapp',
        criadoEm?: string,
        destinatario?: string,
        enviada?: boolean,
        mensagem?: string,
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
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this notificacao.
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
     * @param id A unique integer value identifying this notificacao.
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
     * @param id A unique integer value identifying this notificacao.
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
     * @param id A unique integer value identifying this notificacao.
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
     * @param pagoEm
     * @param referenciaExterna
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
        pagoEm?: string,
        referenciaExterna?: string,
        status: 'CAN' | 'CON' | 'EST' | 'FAL' | 'PEN' = 'PEN',
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
                'pago_em': pagoEm,
                'referencia_externa': referenciaExterna,
                'status': status,
                'valor': valor,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this pagamento.
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
     * @param id A unique integer value identifying this pagamento.
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
     * @param id A unique integer value identifying this pagamento.
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
     * @param id A unique integer value identifying this pagamento.
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
     * @param criadoEm
     * @param fatura
     * @param numero
     * @param pagamento
     * @param valor
     * @returns Recibo
     * @throws ApiError
     */
    public static v1PagamentosReciboList(
        criadoEm?: string,
        fatura?: number,
        numero?: string,
        pagamento?: number,
        valor?: number,
    ): CancelablePromise<Array<Recibo>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/pagamentos/recibo/',
            query: {
                'criado_em': criadoEm,
                'fatura': fatura,
                'numero': numero,
                'pagamento': pagamento,
                'valor': valor,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this Recibo.
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
     * @param id A unique integer value identifying this Recibo.
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
     * @param id A unique integer value identifying this Recibo.
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
     * @param id A unique integer value identifying this Recibo.
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
     * @param confirmado
     * @param criadoEm
     * @param dataConfirmacao
     * @param transacao
     * @returns Reconciliacao
     * @throws ApiError
     */
    public static v1PagamentosReconciliacaoList(
        confirmado?: boolean,
        criadoEm?: string,
        dataConfirmacao?: string,
        transacao?: number,
    ): CancelablePromise<Array<Reconciliacao>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/pagamentos/reconciliacao/',
            query: {
                'confirmado': confirmado,
                'criado_em': criadoEm,
                'data_confirmacao': dataConfirmacao,
                'transacao': transacao,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this Reconciliação.
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
     * @param id A unique integer value identifying this Reconciliação.
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
     * @param id A unique integer value identifying this Reconciliação.
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
     * @param id A unique integer value identifying this Reconciliação.
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
     * @param criadoEm
     * @param gateway
     * @param referenciaExterna
     * @param status
     * @returns Transacao
     * @throws ApiError
     */
    public static v1PagamentosTransacaoList(
        criadoEm?: string,
        gateway?: string,
        referenciaExterna?: string,
        status?: string,
    ): CancelablePromise<Array<Transacao>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/pagamentos/transacao/',
            query: {
                'criado_em': criadoEm,
                'gateway': gateway,
                'referencia_externa': referenciaExterna,
                'status': status,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this Transação.
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
     * @param id A unique integer value identifying this Transação.
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
     * @param id A unique integer value identifying this Transação.
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
     * @param id A unique integer value identifying this Transação.
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
     * @returns any No response body
     * @throws ApiError
     */
    public static v1RecepcaoAtendimentoCreate(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/recepcao/atendimento/',
        });
    }
    /**
     * @param id
     * @returns any No response body
     * @throws ApiError
     */
    public static v1RecepcaoAtendimentoRetrieve(
        id: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/recepcao/atendimento/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
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
     * @param paciente
     * @param prioridade * `URG` - Urgente
     * * `PREF` - Preferencial
     * * `NOR` - Normal
     * @param requisicao
     * @returns CheckinRecepcao
     * @throws ApiError
     */
    public static v1RecepcaoCheckinList(
        atendente?: number,
        chamadoEm?: string,
        chegouEm?: string,
        concluidoEm?: string,
        criadoEm?: string,
        estado: 'AGUARD' | 'ATEND' | 'CANC' | 'CONC' | 'FAT' | 'REQ' = 'AGUARD',
        fatura?: number,
        inquilino?: number,
        paciente?: number,
        prioridade: 'NOR' | 'PREF' | 'URG' = 'NOR',
        requisicao?: number,
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
                'paciente': paciente,
                'prioridade': prioridade,
                'requisicao': requisicao,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this Check-in.
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
     * @param id A unique integer value identifying this Check-in.
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
     * @param id A unique integer value identifying this Check-in.
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
     * @param id A unique integer value identifying this Check-in.
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
     * @param id A unique integer value identifying this Check-in.
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
     * @param id A unique integer value identifying this Check-in.
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
     * @param id A unique integer value identifying this Check-in.
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
     * @param id A unique integer value identifying this Check-in.
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
     * @param id A unique integer value identifying this Check-in.
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
     * @param id A unique integer value identifying this Check-in.
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
     * @param id A unique integer value identifying this Check-in.
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
     * @param id A unique integer value identifying this Check-in.
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
     * @param id A unique integer value identifying this Check-in.
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
     * @returns any No response body
     * @throws ApiError
     */
    public static v1RecepcaoWorkspaceRetrieve(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/recepcao/workspace/',
        });
    }
    /**
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
     * @param plano
     * @param requisicaoId
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
        plano?: number,
        requisicaoId?: string,
        status: 'APROVADA' | 'NEGADA' | 'PENDENTE' = 'PENDENTE',
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
                'plano': plano,
                'requisicao_id': requisicaoId,
                'status': status,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this Autorização de Procedimento.
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
     * @param id A unique integer value identifying this Autorização de Procedimento.
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
     * @param id A unique integer value identifying this Autorização de Procedimento.
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
     * @param id A unique integer value identifying this Autorização de Procedimento.
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
     * @param percentualCobertura
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
        percentualCobertura?: number,
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
                'percentual_cobertura': percentualCobertura,
                'seguradora': seguradora,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this Plano de Cobertura.
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
     * @param id A unique integer value identifying this Plano de Cobertura.
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
     * @param id A unique integer value identifying this Plano de Cobertura.
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
     * @param id A unique integer value identifying this Plano de Cobertura.
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
                'telefone': telefone,
            },
        });
    }
    /**
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
     * @param id A unique integer value identifying this Seguradora.
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
     * @param id A unique integer value identifying this Seguradora.
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
     * @param id A unique integer value identifying this Seguradora.
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
     * @param id A unique integer value identifying this Seguradora.
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
