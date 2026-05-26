/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type IntegrationRouting = {
    readonly id?: number;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    exam_type?: 'LAB' | 'MED';
    sector: 'Hematologia' | 'Bioquimica' | 'Microbiologia' | 'Imunologia' | 'Serologia' | 'Parasitologia' | 'BiologiaMolecular' | 'Toxicologia' | 'Hormonios' | 'MarcadoresTumorais' | 'Coagulacao' | 'Urinalise' | 'LiquidosCorporais' | 'Gasometria' | 'NutricaoClinica' | 'Micologia' | 'Virologia' | 'Bacteriologia' | 'BancoSangue' | 'ImunoHematologia' | 'Triagem' | 'RecepcaoAmostras' | 'ControleQualidade' | 'Pesquisa' | 'Outro';
    active?: boolean;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    equipment: number;
};
