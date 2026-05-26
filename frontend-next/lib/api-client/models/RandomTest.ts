/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RandomTest = {
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
    question_count?: number;
    random_seed?: string;
    status?: 'SCHEDULED' | 'OPENED' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
    notes?: string;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    course: number;
    classroom: number;
    enrollment: number;
    student: number;
    teacher?: number | null;
};
