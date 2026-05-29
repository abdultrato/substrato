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
    modality?: 'ECG' | 'HEM' | 'BIO' | 'IMU' | 'COAG' | 'URI' | 'GAS' | 'US' | 'XR' | 'CT' | 'MRI' | 'MG' | 'ECHO' | 'HOLTER' | 'MAPA' | 'EEG' | 'OCT' | 'VISUAL_FIELD' | 'CORNEAL_TOPOGRAPHY' | 'OUT';
    protocol?: 'HTTP_JSON' | 'HL7_MLLP' | 'ASTM_TCP' | 'TCP_JSON' | 'TCP_RAW' | 'DICOM' | 'FILE_DROP';
    manufacturer?: string;
    model?: string;
    serial_number?: string;
    active?: boolean;
    connection_mode?: 'PASSIVE_API' | 'TCP_SERVER' | 'TCP_CLIENT';
    tcp_host?: string;
    tcp_port?: number | null;
    tcp_timeout_seconds?: number;
    tcp_framing?: 'JSON_LINE' | 'MLLP' | 'ASTM' | 'RAW';
    encoding?: string;
    auto_consume_results?: boolean;
    supported_exam_types?: Array<any>;
    readonly last_seen_at?: string | null;
    config?: Record<string, any>;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
};
