/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type BloodDonation = {
    readonly id?: number;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly custom_id?: string | null;
    readonly deleted?: boolean;
    readonly deleted_at?: string | null;
    readonly version?: number;
    donor_role?: 'VOL' | 'REP';
    bag_identifier: string;
    blood_type?: 'O-' | 'O+' | 'A-' | 'A+' | 'B-' | 'B+' | 'AB-' | 'AB+' | 'UNK';
    donation_type?: 'WBL' | 'APH';
    status?: 'REG' | 'SCR' | 'COM' | 'CAN';
    screening_status?: 'PEN' | 'APR' | 'REJ';
    collected_at?: string;
    processed_at?: string | null;
    volume_ml?: number;
    donor_weight_kg?: string | null;
    hemoglobin_g_dl?: string | null;
    donor_height_cm?: number | null;
    blood_pressure_systolic?: number | null;
    blood_pressure_diastolic?: number | null;
    pulse_bpm?: number | null;
    temperature_c?: string | null;
    hiv_test?: 'PEN' | 'NEG' | 'POS' | 'INC' | 'NDO';
    syphilis_rpr_test?: 'PEN' | 'NEG' | 'POS' | 'INC' | 'NDO';
    hepatitis_b_hbsag_test?: 'PEN' | 'NEG' | 'POS' | 'INC' | 'NDO';
    hepatitis_c_anti_hcv_test?: 'PEN' | 'NEG' | 'POS' | 'INC' | 'NDO';
    malaria_test?: 'PEN' | 'NEG' | 'POS' | 'INC' | 'NDO';
    test_notes?: string;
    contraindications?: string;
    notes?: string;
    readonly created_by?: string | null;
    readonly updated_by?: string | null;
    readonly deleted_by?: string | null;
    readonly tenant?: string;
    donor: number;
    replacement_for?: number | null;
    collected_by?: number | null;
};
