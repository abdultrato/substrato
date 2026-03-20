/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ConsultaMedicaEstadoEnum } from './ConsultaMedicaEstadoEnum';
import type { TipoHorarioEnum } from './TipoHorarioEnum';
export type ConsultaMedica = {
    readonly id?: number;
    tipo?: string;
    readonly paciente_nome?: string;
    readonly medico_nome?: string;
    readonly fatura_id?: number | null;
    readonly fatura_codigo?: string;
    readonly fatura_estado?: string;
    readonly criado_em?: string;
    readonly atualizado_em?: string;
    readonly id_custom?: string | null;
    readonly deletado?: boolean;
    readonly deletado_em?: string | null;
    readonly versao?: number;
    descricao?: string;
    agendada_para?: string;
    estado?: ConsultaMedicaEstadoEnum;
    preco?: string;
    /**
     * Fator aplicado sobre o preço base conforme horário/feriado.
     */
    readonly multiplicador_preco?: string;
    readonly tipo_horario?: TipoHorarioEnum;
    /**
     * Marque se a data for feriado mesmo não sendo fim de semana.
     */
    feriado_manual?: boolean;
    concluida_em?: string | null;
    cancelada_em?: string | null;
    readonly criado_por?: number | null;
    readonly atualizado_por?: number | null;
    readonly inquilino?: number;
    readonly deletado_por?: number | null;
    paciente: number;
    medico?: number | null;
    especialidade?: number | null;
};

