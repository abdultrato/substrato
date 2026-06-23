/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Patient = {
    readonly id?: number;
    readonly origin_company_name?: string;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    /**
     * Nome completo do patient (2-150 caracteres)
     */
    name: string;
    /**
     * Indicador se patient está pregnant
     */
    pregnant?: boolean;
    /**
     * Semanas de gestação (preencher se pregnant)
     */
    gestational_age_weeks?: number | null;
    /**
     * Data de nascimento do patient (formato YYYY-MM-DD)
     */
    birth_date?: string | null;
    /**
     * Gênero do patient (M ou F)
     */
    gender?: 'Masculino' | 'Femenino';
    blood_type?: 'O-' | 'O+' | 'A-' | 'A+' | 'B-' | 'B+' | 'AB-' | 'AB+' | 'UNK';
    is_replacement_donor_inapt?: boolean;
    replacement_donor_inapt_at?: string | null;
    replacement_donor_inapt_reason?: string;
    /**
     * Classificação de raça/origin
     */
    race_origin?: 'Branca' | 'Negra' | 'Parda' | 'Amarela' | 'Indígena' | 'Outro';
    /**
     * Tipo de documento de identidade (BI, CC, Passaporte, etc)
     */
    document_type?: 'BI' | 'PASS' | 'DIRE' | 'CC' | 'NUIT' | 'CE' | 'CN' | 'OUT';
    /**
     * Número único do documento de identidade
     */
    document_number?: string | null;
    address_street?: string;
    address_number?: string;
    address_neighborhood?: string;
    address_city?: string;
    address_province?: string;
    address_postal_code?: string;
    address_country?: 'AF' | 'ZA' | 'AL' | 'DE' | 'AD' | 'AO' | 'AI' | 'AQ' | 'AG' | 'SA' | 'DZ' | 'AR' | 'AM' | 'AW' | 'AU' | 'AT' | 'AZ' | 'BS' | 'BD' | 'BB' | 'BH' | 'BE' | 'BZ' | 'BJ' | 'BM' | 'BY' | 'BO' | 'BQ' | 'BA' | 'BW' | 'BR' | 'BN' | 'BG' | 'BF' | 'BI' | 'BT' | 'CV' | 'CM' | 'KH' | 'CA' | 'KZ' | 'TD' | 'CL' | 'CN' | 'CY' | 'CO' | 'KM' | 'CG' | 'CD' | 'KP' | 'KR' | 'CR' | 'CI' | 'HR' | 'CU' | 'CW' | 'DK' | 'DJ' | 'DM' | 'EG' | 'SV' | 'AE' | 'EC' | 'ER' | 'SK' | 'SI' | 'ES' | 'SZ' | 'US' | 'EE' | 'ET' | 'FJ' | 'PH' | 'FI' | 'FR' | 'GA' | 'GM' | 'GH' | 'GE' | 'GS' | 'GI' | 'GD' | 'GR' | 'GL' | 'GP' | 'GU' | 'GT' | 'GG' | 'GY' | 'GF' | 'GN' | 'GQ' | 'GW' | 'HT' | 'HN' | 'HK' | 'HU' | 'YE' | 'BV' | 'HM' | 'CX' | 'NF' | 'IM' | 'AX' | 'KY' | 'CC' | 'CK' | 'FK' | 'FO' | 'MP' | 'MH' | 'UM' | 'SB' | 'TC' | 'VI' | 'VG' | 'IN' | 'ID' | 'IR' | 'IQ' | 'IE' | 'IS' | 'IL' | 'IT' | 'JM' | 'JP' | 'JE' | 'JO' | 'KI' | 'KW' | 'LA' | 'LS' | 'LV' | 'LB' | 'LR' | 'LY' | 'LI' | 'LT' | 'LU' | 'MO' | 'MK' | 'MG' | 'MY' | 'MW' | 'MV' | 'ML' | 'MT' | 'MA' | 'MQ' | 'MU' | 'MR' | 'YT' | 'MX' | 'FM' | 'MZ' | 'MD' | 'MC' | 'MN' | 'ME' | 'MS' | 'MM' | 'NA' | 'NR' | 'NP' | 'NI' | 'NE' | 'NG' | 'NU' | 'NO' | 'NC' | 'NZ' | 'OM' | 'NL' | 'PW' | 'PS' | 'PA' | 'PG' | 'PK' | 'PY' | 'PE' | 'PN' | 'PF' | 'PL' | 'PR' | 'PT' | 'QA' | 'KE' | 'KG' | 'GB' | 'CF' | 'DO' | 'CZ' | 'RE' | 'RO' | 'RW' | 'RU' | 'EH' | 'BL' | 'KN' | 'PM' | 'WS' | 'AS' | 'SM' | 'SH' | 'LC' | 'MF' | 'SX' | 'ST' | 'VC' | 'SN' | 'SL' | 'RS' | 'SC' | 'SG' | 'SY' | 'SO' | 'LK' | 'SD' | 'SS' | 'SE' | 'CH' | 'SR' | 'SJ' | 'TJ' | 'TH' | 'TW' | 'TZ' | 'IO' | 'TF' | 'TL' | 'TG' | 'TK' | 'TO' | 'TT' | 'TN' | 'TM' | 'TR' | 'TV' | 'UA' | 'UG' | 'UY' | 'UZ' | 'VU' | 'VA' | 'VE' | 'VN' | 'WF' | 'ZM' | 'ZW';
    address_complement?: string;
    /**
     * Texto livre ou resumo (auto) da address.
     */
    address?: string;
    /**
     * Número de phone para contato (incluir indicativo país)
     */
    contact?: string | null;
    /**
     * Email único do patient para contato
     */
    email?: string | null;
    /**
     * Origem/proveniência do patient na clínica
     */
    provenance?: 'Ambulatório' | 'Clínica Externa' | 'Medicina Ocupacional' | 'Maternidade' | 'Ginecologia' | 'Pediatria' | 'Banco de Socorros' | 'Consulta Externa' | 'Urologia' | 'Cirurgia' | 'Dentária' | 'Oftalmologia' | 'Doação de Sangue' | 'Outro';
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    /**
     * Para medicina ocupacional, indique a empresa de origin do patient.
     */
    origin_company?: number | null;
};
