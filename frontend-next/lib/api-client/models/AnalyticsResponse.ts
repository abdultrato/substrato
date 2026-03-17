/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnalyticsRange } from './AnalyticsRange';
import type { AnalyticsTopConsulta } from './AnalyticsTopConsulta';
import type { AnalyticsTopExame } from './AnalyticsTopExame';
import type { AnalyticsTopMedicamento } from './AnalyticsTopMedicamento';
import type { AnalyticsTopProcedimento } from './AnalyticsTopProcedimento';
export type AnalyticsResponse = {
    range: AnalyticsRange;
    kpis: Record<string, any>;
    top_exames: Array<AnalyticsTopExame>;
    top_procedimentos: Array<AnalyticsTopProcedimento>;
    top_medicamentos: Array<AnalyticsTopMedicamento>;
    top_consultas: Array<AnalyticsTopConsulta>;
};

