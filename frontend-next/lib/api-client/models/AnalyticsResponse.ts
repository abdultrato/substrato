/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AnalyticsResponse = {
    range: {
        inicio?: string | null;
        fim?: string | null;
    };
    kpis: Record<string, any>;
    top_exams: Array<{
        type: string;
        id?: number | null;
        name: string;
        total: number;
    }>;
    top_procedures: Array<{
        catalog_id?: number | null;
        catalog__name?: string;
        total: number;
    }>;
    top_medicamentos: Array<{
        product_id?: number | null;
        product__name?: string;
        total_quantity: string;
        total_pedidos: number;
    }>;
    top_consultations: Array<{
        type?: string;
        total: number;
    }>;
};
