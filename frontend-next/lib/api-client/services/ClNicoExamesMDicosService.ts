/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExameMedico } from '../models/ExameMedico';
import type { ExameMedicoRequest } from '../models/ExameMedicoRequest';
import type { PatchedExameMedicoRequest } from '../models/PatchedExameMedicoRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ClNicoExamesMDicosService {
    /**
     * Gerenciamento de exames médicos (imagem/diagnóstico)
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
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param preco
     * @param search Um termo de busca.
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
     * @returns ExameMedico
     * @throws ApiError
     */
    public static v1ClinicoExamemedicoList(
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
    ): CancelablePromise<Array<ExameMedico>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinico/examemedico/',
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
     * Gerenciamento de exames médicos (imagem/diagnóstico)
     * @param requestBody
     * @returns ExameMedico
     * @throws ApiError
     */
    public static v1ClinicoExamemedicoCreate(
        requestBody: ExameMedicoRequest,
    ): CancelablePromise<ExameMedico> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/clinico/examemedico/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Gerenciamento de exames médicos (imagem/diagnóstico)
     * @param id Um valor inteiro único que identifica este Exame médico.
     * @returns ExameMedico
     * @throws ApiError
     */
    public static v1ClinicoExamemedicoRetrieve(
        id: number,
    ): CancelablePromise<ExameMedico> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinico/examemedico/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Gerenciamento de exames médicos (imagem/diagnóstico)
     * @param id Um valor inteiro único que identifica este Exame médico.
     * @param requestBody
     * @returns ExameMedico
     * @throws ApiError
     */
    public static v1ClinicoExamemedicoUpdate(
        id: number,
        requestBody: ExameMedicoRequest,
    ): CancelablePromise<ExameMedico> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/clinico/examemedico/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Gerenciamento de exames médicos (imagem/diagnóstico)
     * @param id Um valor inteiro único que identifica este Exame médico.
     * @param requestBody
     * @returns ExameMedico
     * @throws ApiError
     */
    public static v1ClinicoExamemedicoPartialUpdate(
        id: number,
        requestBody?: PatchedExameMedicoRequest,
    ): CancelablePromise<ExameMedico> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/clinico/examemedico/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Gerenciamento de exames médicos (imagem/diagnóstico)
     * @param id Um valor inteiro único que identifica este Exame médico.
     * @returns void
     * @throws ApiError
     */
    public static v1ClinicoExamemedicoDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/clinico/examemedico/{id}/',
            path: {
                'id': id,
            },
        });
    }
}
