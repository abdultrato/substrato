/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExameCampoTipoEnum } from './ExameCampoTipoEnum';
import type { UnidadeEnum } from './UnidadeEnum';
/**
 * Serializer para campos de exame.
 * Define parâmetros específicos de cada exame.
 */
export type PatchedExameCampoRequest = {
    deletado?: boolean;
    deletado_em?: string | null;
    versao?: number;
    /**
     * Nome do parâmetro/campo do exame
     */
    nome?: string;
    tipo?: ExameCampoTipoEnum;
    /**
     * Unidade de medida do parâmetro (ex: mg/dL, g/L)
     *
     * * `g/dl` - g/dl
     * * `mg/dl` - mg/dl
     * * `mmol/l` - mmol/l
     * * `µmol/l` - µmol/l
     * * `cel/mm3` - cel/mm3
     * * `x10³/µl` - x10³/µl
     * * `×10⁶/µL` - ×10⁶/µL
     * * `%` - %
     * * `u/l` - u/l
     * * `p/µL` - p/µL
     * * `ph` - ph
     * * `fl` - fl
     */
    unidade?: UnidadeEnum;
    referencia_min?: string | null;
    referencia_max?: string | null;
    critico_min?: string | null;
    critico_max?: string | null;
    delta_max?: string | null;
    criado_por?: number | null;
    atualizado_por?: number | null;
    inquilino?: number;
    deletado_por?: number | null;
    exame?: number;
};

