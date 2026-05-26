/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ProcedureCatalog = {
    readonly id?: number;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    name: string;
    /**
     * Código operacional/faturável do procedimento.
     */
    procedure_code?: string;
    description?: string;
    default_price?: string;
    /**
     * Taxa de IVA aplicada ao procedure (0 a 100).
     */
    vat_percentage?: string;
    /**
     * Desmarque se este procedure normalmente não deve ter IVA.
     */
    applies_vat_by_default?: boolean;
    /**
     * Tempo médio esperado para execução do procedimento.
     */
    estimated_duration_minutes?: number;
    active?: boolean;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
};
