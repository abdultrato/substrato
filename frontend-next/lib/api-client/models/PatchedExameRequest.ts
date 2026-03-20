/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BlankEnum } from './BlankEnum';
import type { ExameSetorEnum } from './ExameSetorEnum';
import type { MetodoLaboratorioEnum } from './MetodoLaboratorioEnum';
import type { NullEnum } from './NullEnum';
/**
 * Serializer para a entidade Exame com validação robusta.
 * Inclui validação de preço e tempo de resposta.
 */
export type PatchedExameRequest = {
    /**
     * Nome descritivo do exame (3-100 caracteres)
     */
    nome?: string;
    /**
     * Tempo de resposta em horas (1-720)
     */
    trl_horas?: number;
    /**
     * Preço do exame em unidades monetárias (≥0.01)
     */
    preco?: string;
    /**
     * Taxa de IVA aplicada ao exame (0 a 100).
     */
    iva_percentual?: string;
    /**
     * Desmarque se este exame normalmente não deve ter IVA.
     */
    aplica_iva_por_padrao?: boolean;
    /**
     * Método utilizado para realizar o exame
     *
     * * `Enzimatico` - Enzimático
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
     */
    metodo?: MetodoLaboratorioEnum;
    /**
     * Setor do laboratório responsável pelo exame
     *
     * * `Hematologia` - Hematologia
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
     */
    setor?: (ExameSetorEnum | BlankEnum | NullEnum) | null;
};

