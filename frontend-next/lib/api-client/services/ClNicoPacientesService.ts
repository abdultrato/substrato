/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Paciente } from '../models/Paciente';
import type { PacienteRequest } from '../models/PacienteRequest';
import type { PatchedPacienteRequest } from '../models/PatchedPacienteRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ClNicoPacientesService {
    /**
     * Listar pacientes com filtros, busca e paginação
     * @param atualizadoEm
     * @param atualizadoPor
     * @param contacto
     * @param criadoEm
     * @param criadoPor
     * @param dataNascimento
     * @param deletado
     * @param email
     * @param genero Filtrar por gênero
     * @param idCustom
     * @param inquilino
     * @param morada
     * @param nome
     * @param numeroId
     * @param ordering Qual campo usar ao ordenar os resultados.
     * @param proveniencia * `Ambulatório` - Ambulatório
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
     * @param racaOrigem * `Branca` - Branca
     * * `Negra` - Negra
     * * `Parda` - Parda
     * * `Amarela` - Amarela
     * * `Indígena` - Indígena
     * * `Outro` - Outro
     * @param search Buscar por nome, email, género
     * @param tipoDocumento * `BI` - Bilhete de Identidade
     * * `PASS` - Passaporte
     * * `DIRE` - Documento de Identificação de Residente Estrangeiro
     * * `CC` - Carta de Condução
     * * `NUIT` - Número Único de Identificação Tributária
     * * `CE` - Cartão de Eleitor
     * * `CN` - Certidão de Nascimento
     * * `OUT` - Outro
     * @returns Paciente
     * @throws ApiError
     */
    public static v1ClinicoPacienteList(
        atualizadoEm?: string,
        atualizadoPor?: number,
        contacto?: string,
        criadoEm?: string,
        criadoPor?: number,
        dataNascimento?: string,
        deletado?: boolean,
        email?: string,
        genero?: string,
        idCustom?: string,
        inquilino?: number,
        morada?: string,
        nome?: string,
        numeroId?: string,
        ordering?: string,
        proveniencia?: 'Ambulatório' | 'Banco de Socorros' | 'Cirurgia' | 'Clínica Externa' | 'Consulta Externa' | 'Dentária' | 'Ginecologia' | 'Maternidade' | 'Medicina Ocupacional' | 'Oftalmologia' | 'Outro' | 'Pediatria' | 'Urologia',
        racaOrigem?: 'Amarela' | 'Branca' | 'Indígena' | 'Negra' | 'Outro' | 'Parda',
        search?: string,
        tipoDocumento?: 'BI' | 'CC' | 'CE' | 'CN' | 'DIRE' | 'NUIT' | 'OUT' | 'PASS',
    ): CancelablePromise<Array<Paciente>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinico/paciente/',
            query: {
                'atualizado_em': atualizadoEm,
                'atualizado_por': atualizadoPor,
                'contacto': contacto,
                'criado_em': criadoEm,
                'criado_por': criadoPor,
                'data_nascimento': dataNascimento,
                'deletado': deletado,
                'email': email,
                'genero': genero,
                'id_custom': idCustom,
                'inquilino': inquilino,
                'morada': morada,
                'nome': nome,
                'numero_id': numeroId,
                'ordering': ordering,
                'proveniencia': proveniencia,
                'raca_origem': racaOrigem,
                'search': search,
                'tipo_documento': tipoDocumento,
            },
        });
    }
    /**
     * Criar novo paciente com validação de email e documento únicos
     * @param requestBody
     * @returns Paciente
     * @throws ApiError
     */
    public static v1ClinicoPacienteCreate(
        requestBody: PacienteRequest,
    ): CancelablePromise<Paciente> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/clinico/paciente/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Obter detalhes de um paciente
     * @param id Um valor inteiro único que identifica este Paciente.
     * @returns Paciente
     * @throws ApiError
     */
    public static v1ClinicoPacienteRetrieve(
        id: number,
    ): CancelablePromise<Paciente> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinico/paciente/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Atualizar paciente completamente
     * @param id Um valor inteiro único que identifica este Paciente.
     * @param requestBody
     * @returns Paciente
     * @throws ApiError
     */
    public static v1ClinicoPacienteUpdate(
        id: number,
        requestBody: PacienteRequest,
    ): CancelablePromise<Paciente> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/clinico/paciente/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Atualizar parcialmente um paciente
     * @param id Um valor inteiro único que identifica este Paciente.
     * @param requestBody
     * @returns Paciente
     * @throws ApiError
     */
    public static v1ClinicoPacientePartialUpdate(
        id: number,
        requestBody?: PatchedPacienteRequest,
    ): CancelablePromise<Paciente> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/clinico/paciente/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Gerenciamento de pacientes
     * @param id Um valor inteiro único que identifica este Paciente.
     * @returns void
     * @throws ApiError
     */
    public static v1ClinicoPacienteDestroy(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/clinico/paciente/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Gerenciamento de pacientes
     * @param id Um valor inteiro único que identifica este Paciente.
     * @returns Paciente
     * @throws ApiError
     */
    public static v1ClinicoPacienteHistoriaClinicaPorId(
        id: number,
    ): CancelablePromise<Paciente> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinico/paciente/{id}/historia_clinica/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Gerenciamento de pacientes
     * @returns Paciente
     * @throws ApiError
     */
    public static v1ClinicoPacienteHistoriaClinicaPorDocumento(): CancelablePromise<Paciente> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinico/paciente/historia_clinica/',
        });
    }
}
