/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type DisciplineScheduleItem = {
    readonly id?: number;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    item_type?: 'TEST' | 'ASSIGNMENT' | 'THEME' | 'EXERCISE';
    title: string;
    description?: string;
    scheduled_date: string;
    requires_attendance?: boolean;
    status?: 'PLANNED' | 'COMPLETED' | 'OVERDUE';
    completed_at?: string | null;
    notes?: string;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    course: number;
    classroom: number;
    linked_examination?: number | null;
    linked_assignment?: number | null;
    linked_content?: number | null;
};
