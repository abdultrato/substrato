/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type LabExam = {
    readonly id?: number;
    readonly sample_type_name?: string;
    readonly sample_options_details?: string;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    /**
     * Nome descritivo do exam (3-100 caracteres)
     */
    name: string;
    /**
     * Tempo de response em hours (1-720)
     */
    turnaround_hours?: number;
    /**
     * Preço do exam em unidades monetárias (≥0.01)
     */
    price?: string;
    /**
     * Taxa de IVA aplicada ao exame (0 a 100).
     */
    vat_percentage?: string;
    /**
     * Desmarque se este exame normalmente não deve ter IVA.
     */
    applies_vat_by_default?: boolean;
    /**
     * Método utilizado para realizar o exam
     */
    method: 'Enzimatico' | 'Colorimetrico' | 'Espectrofotometrico' | 'Turbidimetrico' | 'Nefelometrico' | 'Potenciometrico' | 'Eletroquimico' | 'ELISA' | 'Quimioluminescencia' | 'Eletroquimioluminescencia' | 'Imunofluorescencia' | 'Imunoturbidimetria' | 'Aglutinacao' | 'Cultura' | 'Antibiograma' | 'Microscopico' | 'ColoracaoGram' | 'ColoracaoZiehl' | 'IsolamentoMicrobiano' | 'CitometriaFluxo' | 'HematologiaAutomatizada' | 'MicroscopiaOptica' | 'PCR' | 'RT_PCR' | 'PCRTempoReal' | 'Sequenciamento' | 'HibridizacaoMolecular' | 'Genotipagem' | 'Cromatografia' | 'CromatografiaGasosa' | 'CromatografiaLiquida' | 'HPLC' | 'Eletroforese' | 'Isoeletrofoque' | 'Sedimentacao' | 'Flutuacao' | 'KatoKatz' | 'TiraReagente' | 'AnaliseMicroscopica' | 'EspectrometriaMassa' | 'MALDI_TOF' | 'RessonanciaMagneticaNuclear';
    /**
     * Setor do laboratório responsável pelo exam
     */
    sector?: 'Hematologia' | 'Bioquimica' | 'Microbiologia' | 'Imunologia' | 'Serologia' | 'Parasitologia' | 'BiologiaMolecular' | 'Toxicologia' | 'Hormonios' | 'MarcadoresTumorais' | 'Coagulacao' | 'Urinalise' | 'LiquidosCorporais' | 'Gasometria' | 'NutricaoClinica' | 'Micologia' | 'Virologia' | 'Bacteriologia' | 'BancoSangue' | 'ImunoHematologia' | 'Triagem' | 'RecepcaoAmostras' | 'ControleQualidade' | 'Pesquisa' | 'Outro' | null;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    /**
     * Tipo de amostra biológica exigida para o exame.
     */
    sample_type: number;
    /**
     * Opções de amostras aceites para o exame.
     */
    sample_options?: Array<number>;
};
