/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Sample = {
    readonly id?: number;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    name: string;
    bottle_type?: 'TUBO_SECO' | 'TUBO_EDTA' | 'TUBO_CITRATO' | 'TUBO_FLUORETO' | 'FRASCO_URINA' | 'FRASCO_FEZES' | 'FRASCO_ESTERIL' | 'HEMOCULTURA' | 'OUTRO';
    /**
     * Ex.: roxa, vermelha, azul, amarela.
     */
    cap_color?: string;
    minimum_volume_ml?: string;
    fasting_required?: boolean;
    fasting_hours?: number;
    /**
     * Ex.: ambiente, refrigerado (2-8°C), congelado (-20°C).
     */
    storage_temperature?: string;
    stability_hours?: number;
    anticoagulant?: string;
    collection_instructions?: string;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
};
