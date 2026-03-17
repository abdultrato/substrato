/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { NullEnum } from './NullEnum';
import type { PasswordResetRequestCanalEnum } from './PasswordResetRequestCanalEnum';
export type PasswordResetRequestRequest = {
    username?: string;
    email?: string;
    telefone?: string;
    canal?: (PasswordResetRequestCanalEnum | NullEnum) | null;
};

