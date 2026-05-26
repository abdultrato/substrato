/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ExaminationAttempt = {
    readonly id?: number;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    status?: 'OPENED' | 'SUBMITTED' | 'EXPIRED';
    started_at?: string;
    expires_at?: string;
    submitted_at?: string | null;
    time_limit_minutes_snapshot?: number;
    max_score_snapshot?: string;
    submission_payload?: string;
    score?: string | null;
    attempt_number?: number;
    requires_year_repeat?: boolean;
    teacher_feedback?: string;
    graded_at?: string | null;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    examination: number;
    enrollment: number;
    student: number;
    graded_by?: number | null;
};
