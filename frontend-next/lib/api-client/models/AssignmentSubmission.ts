/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AssignmentSubmission = {
    readonly id?: number;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    attempt_number?: number;
    submitted_at?: string;
    status?: 'SUBMITTED' | 'LATE' | 'GRADED';
    content_text?: string;
    attachment_url?: string;
    max_score_snapshot?: string;
    score?: string | null;
    teacher_feedback?: string;
    graded_at?: string | null;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    assignment: number;
    enrollment: number;
    student: number;
    graded_by?: number | null;
};
