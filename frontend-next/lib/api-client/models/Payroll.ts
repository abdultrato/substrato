/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Payroll = {
    readonly id?: number;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    year: number;
    month: number;
    nominal_salary?: string;
    base_month_hours?: number;
    /**
     * Usado como fallback quando o valor extraordinário não estiver definido no funcionário.
     */
    overtime_hour_multiplier?: string;
    readonly salary_increase_value?: string;
    readonly tenure_increase_value?: string;
    readonly family_dependents_count?: number;
    readonly family_allowance_value?: string;
    readonly absence_days?: number;
    readonly discounted_absence_days?: number;
    readonly daily_salary_value?: string;
    readonly absence_discount_value?: string;
    other_discounts_value?: string;
    disciplinary_discount_value?: string;
    readonly ordinary_hours?: string;
    readonly extraordinary_hours?: string;
    readonly ordinary_hour_value?: string;
    readonly extraordinary_hour_value?: string;
    readonly ordinary_hours_value?: string;
    readonly extraordinary_hours_value?: string;
    readonly gross_salary?: string;
    readonly calculated_overtime_hours?: string;
    readonly hourly_value?: string;
    readonly overtime_value?: string;
    readonly total_salary?: string;
    closed?: boolean;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    employee: number;
};
