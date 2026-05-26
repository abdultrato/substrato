/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type MedicalResultFile = {
    readonly id?: number;
    file: Blob;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    type?: 'PDF' | 'IMAGEM' | 'DICOM' | 'VIDEO' | 'TEXTO' | 'NUMERICO';
    description?: string;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    result: number;
    request_item?: number | null;
    medical_exam: number;
};
