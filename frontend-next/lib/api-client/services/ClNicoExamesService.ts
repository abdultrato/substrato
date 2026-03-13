/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Exame } from '../models/Exame';
import type { ExameRequest } from '../models/ExameRequest';
import type { PatchedExameRequest } from '../models/PatchedExameRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ClNicoExamesService {
    /**
     * Listar todos os exames com filtros, busca e paginação
     * @param atualizadoEm
     * @param atualizadoPor
     * @param criadoEm
     * @param criadoPor
     * @param deletado
     * @param idCustom
     * @param inquilino
     * @param metodo * `Enzimatico` - Enzimático
     * * `Colorimetrico` - Colorimétrico
     * * `Espectrofotometrico` - Espectrofotométrico
     * * `Turbidimetrico` - Turbidimétrico
     * * `Nefelometrico` - Nefelométrico
     * * `Potenciometrico` - Potenciométrico
     * * `Eletroquimico` - Eletroquímico
     * * `ELISA` - ELISA
     * * `Quimioluminescencia` - Quimioluminescência
     * * `Eletroquimioluminescencia` - Eletroquimioluminescência
     * * `Imunofluorescencia` - Imunofluorescência
     * * `Imunoturbidimetria` - Imunoturbidimetria
     * * `Aglutinacao` - Aglutinação
     * * `Cultura` - Cultura
     * * `Antibiograma` - Antibiograma
     * * `Microscopico` - Microscópico
     * * `ColoracaoGram` - Coloração de Gram
     * * `ColoracaoZiehl` - Ziehl-Neelsen
     * * `IsolamentoMicrobiano` - Isolamento Microbiano
     * * `CitometriaFluxo` - Citometria de Fluxo
     * * `HematologiaAutomatizada` - Hematologia Automatizada
     * * `MicroscopiaOptica` - Microscopia Óptica
     * * `PCR` - PCR
     * * `RT_PCR` - RT-PCR
     * * `PCRTempoReal` - PCR em Tempo Real
     * * `Sequenciamento` - Sequenciamento Genético
     * * `HibridizacaoMolecular` - Hibridização Molecular
     * * `Genotipagem` - Genotipagem
     * * `Cromatografia` - Cromatografia
     * * `CromatografiaGasosa` - Cromatografia Gasosa
     * * `CromatografiaLiquida` - Cromatografia Líquida
     * * `HPLC` - Cromatografia Líquida de Alta Eficiência
     * * `Eletroforese` - Eletroforese
     * * `Isoeletrofoque` - Isoeletrofocalização
     * * `Sedimentacao` - Sedimentação
     * * `Flutuacao` - Flutuação
     * * `KatoKatz` - Kato-Katz
     * * `TiraReagente` - Tira Reagente
     * * `AnaliseMicroscopica` - Análise Microscópica
     * * `EspectrometriaMassa` - Espectrometria de Massa
     * * `MALDI_TOF` - MALDI-TOF
     * * `RessonanciaMagneticaNuclear` - Ressonância Magnética Nuclear
     * @param nome
     * @param ordering Campo para ordenação
     * @param preco
     * @param search Buscar por nome, método, setor
     * @param setor * `Hematologia` - Hematologia
     * * `Bioquimica` - Bioquímica
     * * `Microbiologia` - Microbiologia
     * * `Imunologia` - Imunologia
     * * `Serologia` - Serologia
     * * `Parasitologia` - Parasitologia
     * * `BiologiaMolecular` - Biologia Molecular
     * * `Toxicologia` - Toxicologia
     * * `Hormonios` - Hormônios e Endocrinologia
     * * `MarcadoresTumorais` - Marcadores Tumorais
     * * `Coagulacao` - Coagulação
     * * `Urinalise` - Urinálise
     * * `LiquidosCorporais` - Líquidos Corporais
     * * `Gasometria` - Gasometria
     * * `NutricaoClinica` - Nutrição Clínica
     * * `Micologia` - Micologia
     * * `Virologia` - Virologia
     * * `Bacteriologia` - Bacteriologia
     * * `BancoSangue` - Banco de Sangue
     * * `ImunoHematologia` - Imuno-hematologia
     * * `Triagem` - Triagem Laboratorial
     * * `RecepcaoAmostras` - Recepção de Amostras
     * * `ControleQualidade` - Controle de Qualidade
     * * `Pesquisa` - Pesquisa Laboratorial
     * * `Outro` - Outro
     * @param trlHoras
     * @returns Exame
     * @throws ApiError
     */
    public static v1ClinicoExameList(
        atualizadoEm?: string,
        atualizadoPor?: number,
        criadoEm?: string,
        criadoPor?: number,
        deletado?: boolean,
        idCustom?: string,
        inquilino?: number,
        metodo?: 'Aglutinacao' | 'AnaliseMicroscopica' | 'Antibiograma' | 'CitometriaFluxo' | 'ColoracaoGram' | 'ColoracaoZiehl' | 'Colorimetrico' | 'Cromatografia' | 'CromatografiaGasosa' | 'CromatografiaLiquida' | 'Cultura' | 'ELISA' | 'Eletroforese' | 'Eletroquimico' | 'Eletroquimioluminescencia' | 'Enzimatico' | 'Espectrofotometrico' | 'EspectrometriaMassa' | 'Flutuacao' | 'Genotipagem' | 'HPLC' | 'HematologiaAutomatizada' | 'HibridizacaoMolecular' | 'Imunofluorescencia' | 'Imunoturbidimetria' | 'Isoeletrofoque' | 'IsolamentoMicrobiano' | 'KatoKatz' | 'MALDI_TOF' | 'MicroscopiaOptica' | 'Microscopico' | 'Nefelometrico' | 'PCR' | 'PCRTempoReal' | 'Potenciometrico' | 'Quimioluminescencia' | 'RT_PCR' | 'RessonanciaMagneticaNuclear' | 'Sedimentacao' | 'Sequenciamento' | 'TiraReagente' | 'Turbidimetrico',
        nome?: string,
        ordering?: string,
        preco?: number,
        search?: string,
        setor?: 'Bacteriologia' | 'BancoSangue' | 'BiologiaMolecular' | 'Bioquimica' | 'Coagulacao' | 'ControleQualidade' | 'Gasometria' | 'Hematologia' | 'Hormonios' | 'ImunoHematologia' | 'Imunologia' | 'LiquidosCorporais' | 'MarcadoresTumorais' | 'Micologia' | 'Microbiologia' | 'NutricaoClinica' | 'Outro' | 'Parasitologia' | 'Pesquisa' | 'RecepcaoAmostras' | 'Serologia' | 'Toxicologia' | 'Triagem' | 'Urinalise' | 'Virologia' | null,
        trlHoras?: number,
    ): CancelablePromise<Array<Exame>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinico/exame/',
            query: {
                'atualizado_em': atualizadoEm,
                'atualizado_por': atualizadoPor,
                'criado_em': criadoEm,
                'criado_por': criadoPor,
                'deletado': deletado,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'metodo': metodo,
                'nome': nome,
                'ordering': ordering,
                'preco': preco,
                'search': search,
                'setor': setor,
                'trl_horas': trlHoras,
            },
        });
    }
    /**
     * Criar novo exame com validação de campos obrigatórios
     * @param requestBody
     * @returns Exame
     * @throws ApiError
     */
    public static v1ClinicoExameCreate(
        requestBody: ExameRequest,
    ): CancelablePromise<Exame> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/clinico/exame/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Obter detalhes de um exame específico
     * @param id A unique integer value identifying this Exame.
     * @returns Exame
     * @throws ApiError
     */
    public static v1ClinicoExameRetrieve(
        id: number,
    ): CancelablePromise<Exame> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinico/exame/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Atualizar exame completamente
     * @param id A unique integer value identifying this Exame.
     * @param requestBody
     * @returns Exame
     * @throws ApiError
     */
    public static v1ClinicoExameUpdate(
        id: number,
        requestBody: ExameRequest,
    ): CancelablePromise<Exame> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/clinico/exame/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Atualizar parcialmente um exame
     * @param id A unique integer value identifying this Exame.
     * @param requestBody
     * @returns Exame
     * @throws ApiError
     */
    public static v1ClinicoExamePartialUpdate(
        id: number,
        requestBody?: PatchedExameRequest,
    ): CancelablePromise<Exame> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/clinico/exame/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Deletar um exame (soft delete)
     * @param id A unique integer value identifying this Exame.
     * @returns void
     * @throws ApiError
     */
    public static v1ClinicoExameDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/clinico/exame/{id}/',
            path: {
                'id': id,
            },
        });
    }
}
