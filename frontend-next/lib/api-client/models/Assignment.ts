/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Assignment = {
    readonly id?: number;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    title: string;
    instructions?: string;
    opens_at?: string | null;
    due_at: string;
    work_category?: 'MANDATORY' | 'HYGIENIC' | 'OPTIONAL';
    max_score?: string;
    status?: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
    allow_late_submission?: boolean;
    allow_multiple_submissions?: boolean;
    max_submissions?: number;
    published_at?: string | null;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    course: number;
    classroom?: number | null;
    teacher?: number | null;
};
