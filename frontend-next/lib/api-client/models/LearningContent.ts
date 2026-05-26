/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type LearningContent = {
    readonly id?: number;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    title: string;
    content_type?: 'LESSON' | 'DOCUMENT' | 'VIDEO' | 'LINK' | 'BIBLIOGRAPHY' | 'THEMATIC_MAP';
    body?: string;
    file_url?: string;
    external_url?: string;
    published?: boolean;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    course: number;
    author?: number | null;
};
