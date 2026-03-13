/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BlankEnum } from './BlankEnum';
import type { GeneroEnum } from './GeneroEnum';
import type { ProvenienciaEnum } from './ProvenienciaEnum';
import type { RacaOrigemEnum } from './RacaOrigemEnum';
import type { TipoDocumentoEnum } from './TipoDocumentoEnum';
/**
 * Serializer para a entidade Paciente com validação robusta.
 * Inclui campos de paciente para leitura/escrita com validação de domínio.
 */
export type PatchedPacienteRequest = {
    /**
     * Nome completo do paciente (2-150 caracteres)
     */
    nome?: string;
    /**
     * Email único do paciente para contato
     */
    email?: string | null;
    /**
     * Número de telefone para contato (incluir indicativo país)
     */
    contacto?: string | null;
    /**
     * Data de nascimento do paciente (formato YYYY-MM-DD)
     */
    data_nascimento?: string | null;
    /**
     * Gênero do paciente (M ou F)
     *
     * * `Masculino` - Masculino
     * * `Femenino` - Femenino
     */
    genero?: GeneroEnum;
    /**
     * Classificação de raça/origem
     *
     * * `Branca` - Branca
     * * `Negra` - Negra
     * * `Parda` - Parda
     * * `Amarela` - Amarela
     * * `Indígena` - Indígena
     * * `Outro` - Outro
     */
    raca_origem?: RacaOrigemEnum;
    /**
     * Tipo de documento de identidade (BI, CC, Passaporte, etc)
     *
     * * `BI` - Bilhete de Identidade
     * * `PASS` - Passaporte
     * * `DIRE` - Documento de Identificação de Residente Estrangeiro
     * * `CC` - Carta de Condução
     * * `NUIT` - Número Único de Identificação Tributária
     * * `CE` - Cartão de Eleitor
     * * `CN` - Certidão de Nascimento
     * * `OUT` - Outro
     */
    tipo_documento?: TipoDocumentoEnum;
    /**
     * Número único do documento de identidade
     */
    numero_id?: string | null;
    morada?: string;
    /**
     * Origem/proveniência do paciente na clínica
     *
     * * `Ambulatório` - Ambulatório
     * * `Clínica Externa` - Clínica Externa
     * * `Medicina Ocupacional` - Medicina Ocupacional
     * * `Maternidade` - Maternidade
     * * `Ginecologia` - Ginecologia
     * * `Pediatria` - Pediatria
     * * `Banco de Socorros` - Banco de Socorros
     * * `Consulta Externa` - Consulta Externa
     * * `Urologia` - Urologia
     * * `Cirurgia` - Cirurgia
     * * `Dentária` - Dentária
     * * `Oftalmologia` - Oftalmologia
     * * `Outro` - Outro
     */
    proveniencia?: (ProvenienciaEnum | BlankEnum);
    /**
     * Indicador se paciente está gestante
     */
    gestante?: boolean;
    /**
     * Semanas de gestação (preencher apenas se gestante)
     */
    idade_gestacional_semanas?: number | null;
};

