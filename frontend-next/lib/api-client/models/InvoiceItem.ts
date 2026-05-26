/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type InvoiceItem = {
    readonly id?: number;
    readonly total_sem_iva?: string;
    readonly vat_amount?: string;
    readonly total_com_iva?: string;
    readonly billed_sector?: string;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    position?: number;
    item_type?: 'EXA' | 'EXM' | 'FAR' | 'PRC' | 'MAT' | 'CON' | 'AJU';
    description?: string;
    /**
     * Informe a quantidade do itens. Para itens de venda, a quantidade será preenchida automaticamente a partir do item de venda selecionado.
     */
    quantity?: string;
    /**
     * Informe o preço unitário do item. Para exames, o preço será preenchido automaticamente a partir do cadastro do exame, podendo ser ajustado para casos específicos.
     */
    unit_price?: string;
    /**
     * Desmarque para não aplicar IVA neste item.
     */
    applies_vat?: boolean;
    /**
     * Deixe em branco para herdar do item (exam/product/procedure).
     */
    vat_percentage?: string | null;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    invoice: number;
    exam?: number | null;
    medical_exam?: number | null;
    consultation?: number | null;
    sale_item?: number | null;
    /**
     * Produto vendido (quando não há referência direta ao item da venda).
     */
    product?: number | null;
    procedure_item?: number | null;
    procedure_material?: number | null;
};
