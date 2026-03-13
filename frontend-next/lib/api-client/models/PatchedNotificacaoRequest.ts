/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CanalEnum } from './CanalEnum';
import type { TipoEventoEnum } from './TipoEventoEnum';
export type PatchedNotificacaoRequest = {
    destinatario?: string;
    canal?: CanalEnum;
    assunto?: string;
    tipo_evento?: TipoEventoEnum;
    referencia_externa?: string;
    mensagem?: string;
    enviada?: boolean;
    erro_envio?: string;
    enviado_em?: string | null;
    paciente?: number | null;
};

