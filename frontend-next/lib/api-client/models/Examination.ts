/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Examination = {
    readonly id?: number;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    title: string;
    scheduled_for: string;
    opens_at?: string | null;
    closes_at?: string | null;
    duration_minutes?: number;
    max_attempts?: number;
    exam_type?: 'REGULAR' | 'TEST' | 'DISCIPLINE_FINAL' | 'COURSE_FINAL';
    discipline_final_stage?: 'NORMAL' | 'RECORRENCIA' | 'ESPECIAL' | null;
    test_slot?: number | null;
    pass_mark?: string;
    status?: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
    published_at?: string | null;
    max_score?: string;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    course: number;
    classroom?: number | null;
};
