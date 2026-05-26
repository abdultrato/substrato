/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type DisciplineScheduleStudentStatus = {
    readonly id?: number;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    status?: 'PENDING' | 'SUCCESS' | 'OVERDUE';
    completion_marked?: boolean;
    completed_at?: string | null;
    attendance_status_snapshot?: string;
    notes?: string;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    schedule_item: number;
    enrollment: number;
};
