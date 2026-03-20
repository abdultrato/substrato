/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BlankEnum } from './BlankEnum';
import type { EnderecoPaisEnum } from './EnderecoPaisEnum';
import type { GeneroEnum } from './GeneroEnum';
import type { ProvenienciaEnum } from './ProvenienciaEnum';
import type { RacaOrigemEnum } from './RacaOrigemEnum';
import type { TipoDocumentoEnum } from './TipoDocumentoEnum';
/**
 * Serializer para a entidade Paciente com validação robusta.
 * Inclui campos de paciente para leitura/escrita com validação de domínio.
 */
export type Paciente = {
    readonly id?: number;
    readonly empresa_origem_nome?: string;
    readonly criado_em?: string;
    readonly atualizado_em?: string;
    readonly id_custom?: string | null;
    readonly deletado?: boolean;
    readonly deletado_em?: string | null;
    readonly versao?: number;
    /**
     * Nome completo do paciente (2-150 caracteres)
     */
    nome: string;
    /**
     * Indicador se paciente está gestante
     */
    gestante?: boolean;
    /**
     * Semanas de gestação (preencher se gestante)
     */
    idade_gestacional_semanas?: number | null;
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
    endereco_rua?: string;
    endereco_numero?: string;
    endereco_bairro?: string;
    endereco_cidade?: string;
    endereco_provincia?: string;
    endereco_codigo_postal?: string;
    endereco_pais?: (EnderecoPaisEnum | BlankEnum);
    endereco_complemento?: string;
    /**
     * Texto livre ou resumo (auto) da morada.
     */
    morada?: string;
    /**
     * Número de telefone para contato (incluir indicativo país)
     */
    contacto?: string | null;
    /**
     * Email único do paciente para contato
     */
    email?: string | null;
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
    readonly criado_por?: number | null;
    readonly atualizado_por?: number | null;
    readonly inquilino?: number;
    readonly deletado_por?: number | null;
    /**
     * Para medicina ocupacional, indique a empresa de origem do paciente.
     */
    empresa_origem?: number | null;
};

