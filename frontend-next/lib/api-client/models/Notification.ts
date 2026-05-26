/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Notification = {
    readonly id?: number;
    readonly patient_name?: string;
    recipient: string;
    channel: 'email' | 'sms' | 'whatsapp';
    subject?: string;
    event_type?: 'GERAL' | 'RESET_SENHA' | 'RESULTADO' | 'FATURA' | 'RECIBO';
    external_reference?: string;
    message: string;
    sent?: boolean;
    send_error?: string;
    sent_at?: string | null;
    readonly created_at?: string;
    patient?: number | null;
};
