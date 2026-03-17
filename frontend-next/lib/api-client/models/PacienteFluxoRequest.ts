/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { GeneroEnum } from './GeneroEnum';
import type { ProvenienciaEnum } from './ProvenienciaEnum';
import type { RacaOrigemEnum } from './RacaOrigemEnum';
import type { TipoDocumentoEnum } from './TipoDocumentoEnum';
export type PacienteFluxoRequest = {
    nome: string;
    morada: string;
    data_nascimento?: string | null;
    genero?: GeneroEnum;
    raca_origem?: RacaOrigemEnum;
    tipo_documento?: TipoDocumentoEnum;
    numero_id?: string | null;
    contacto?: string | null;
    email?: string | null;
    proveniencia?: ProvenienciaEnum;
    gestante?: boolean;
    idade_gestacional_semanas?: number | null;
};

