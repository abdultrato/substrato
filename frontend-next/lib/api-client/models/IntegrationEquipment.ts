/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type IntegrationEquipment = {
    readonly id?: number;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    name: string;
    modality?: 'ECG' | 'HEM' | 'BIO' | 'US' | 'XR' | 'OUT';
    protocol?: 'HTTP_JSON' | 'HL7_MLLP' | 'ASTM_TCP' | 'DICOM' | 'FILE_DROP';
    manufacturer?: string;
    model?: string;
    serial_number?: string;
    active?: boolean;
    config?: Record<string, any>;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
};
