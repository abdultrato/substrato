/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Absence } from '../models/Absence';
import type { Account } from '../models/Account';
import type { AnalyticsResponse } from '../models/AnalyticsResponse';
import type { Assignment } from '../models/Assignment';
import type { AssignmentSubmission } from '../models/AssignmentSubmission';
import type { AttendanceRecord } from '../models/AttendanceRecord';
import type { BloodDonation } from '../models/BloodDonation';
import type { BloodStockMovement } from '../models/BloodStockMovement';
import type { BloodStorage } from '../models/BloodStorage';
import type { BloodStorageMaintenance } from '../models/BloodStorageMaintenance';
import type { BloodTransfusion } from '../models/BloodTransfusion';
import type { BloodUnit } from '../models/BloodUnit';
import type { Classroom } from '../models/Classroom';
import type { ConsultationSpecialty } from '../models/ConsultationSpecialty';
import type { Course } from '../models/Course';
import type { CoveragePlan } from '../models/CoveragePlan';
import type { CycleCount } from '../models/CycleCount';
import type { CycleCountLine } from '../models/CycleCountLine';
import type { DailyInspection } from '../models/DailyInspection';
import type { DeliveryLog } from '../models/DeliveryLog';
import type { DisciplinaryProcess } from '../models/DisciplinaryProcess';
import type { DisciplineScheduleItem } from '../models/DisciplineScheduleItem';
import type { DisciplineScheduleStudentStatus } from '../models/DisciplineScheduleStudentStatus';
import type { Doctor } from '../models/Doctor';
import type { Employee } from '../models/Employee';
import type { Empresa } from '../models/Empresa';
import type { Enrollment } from '../models/Enrollment';
import type { Equipment } from '../models/Equipment';
import type { Examination } from '../models/Examination';
import type { ExaminationAttempt } from '../models/ExaminationAttempt';
import type { FamilyDependent } from '../models/FamilyDependent';
import type { FeatureFlagTenant } from '../models/FeatureFlagTenant';
import type { FinancialReconciliation } from '../models/FinancialReconciliation';
import type { GoodsReceipt } from '../models/GoodsReceipt';
import type { GoodsReceiptLine } from '../models/GoodsReceiptLine';
import type { GradeRecord } from '../models/GradeRecord';
import type { Holiday } from '../models/Holiday';
import type { Incident } from '../models/Incident';
import type { Insurer } from '../models/Insurer';
import type { IntegrationAnalyteMapping } from '../models/IntegrationAnalyteMapping';
import type { IntegrationCredential } from '../models/IntegrationCredential';
import type { IntegrationDocument } from '../models/IntegrationDocument';
import type { IntegrationEquipment } from '../models/IntegrationEquipment';
import type { IntegrationMessage } from '../models/IntegrationMessage';
import type { IntegrationOrder } from '../models/IntegrationOrder';
import type { IntegrationOrderItem } from '../models/IntegrationOrderItem';
import type { IntegrationRouting } from '../models/IntegrationRouting';
import type { InventoryMovement } from '../models/InventoryMovement';
import type { Invoice } from '../models/Invoice';
import type { InvoiceHistory } from '../models/InvoiceHistory';
import type { InvoiceItem } from '../models/InvoiceItem';
import type { JobTitle } from '../models/JobTitle';
import type { LabExam } from '../models/LabExam';
import type { LabExamField } from '../models/LabExamField';
import type { LabRequest } from '../models/LabRequest';
import type { LabRequestItem } from '../models/LabRequestItem';
import type { LargeSurgery } from '../models/LargeSurgery';
import type { LearningContent } from '../models/LearningContent';
import type { LedgerEntry } from '../models/LedgerEntry';
import type { LedgerMovement } from '../models/LedgerMovement';
import type { Lot } from '../models/Lot';
import type { Maintenance } from '../models/Maintenance';
import type { MaterialRequisition } from '../models/MaterialRequisition';
import type { MaterialRequisitionItem } from '../models/MaterialRequisitionItem';
import type { MedicalConsultation } from '../models/MedicalConsultation';
import type { MedicalExam } from '../models/MedicalExam';
import type { MedicalExamField } from '../models/MedicalExamField';
import type { MedicalRecordEntry } from '../models/MedicalRecordEntry';
import type { MedicalResultFile } from '../models/MedicalResultFile';
import type { Notification } from '../models/Notification';
import type { NotificationTemplate } from '../models/NotificationTemplate';
import type { NursingEvolution } from '../models/NursingEvolution';
import type { NursingPrescription } from '../models/NursingPrescription';
import type { NursingRecord } from '../models/NursingRecord';
import type { NursingVitalSign } from '../models/NursingVitalSign';
import type { Overtime } from '../models/Overtime';
import type { PasswordResetToken } from '../models/PasswordResetToken';
import type { Patient } from '../models/Patient';
import type { Payment } from '../models/Payment';
import type { Payroll } from '../models/Payroll';
import type { PickList } from '../models/PickList';
import type { PickListLine } from '../models/PickListLine';
import type { Pregnancy } from '../models/Pregnancy';
import type { PrescriptionItem } from '../models/PrescriptionItem';
import type { Procedure } from '../models/Procedure';
import type { ProcedureAuthorization } from '../models/ProcedureAuthorization';
import type { ProcedureCatalog } from '../models/ProcedureCatalog';
import type { ProcedureCatalogMaterial } from '../models/ProcedureCatalogMaterial';
import type { ProcedureItem } from '../models/ProcedureItem';
import type { ProcedureItemValue } from '../models/ProcedureItemValue';
import type { ProcedureMaterial } from '../models/ProcedureMaterial';
import type { ProcedureMaterialValue } from '../models/ProcedureMaterialValue';
import type { Product } from '../models/Product';
import type { Profession } from '../models/Profession';
import type { ProfessionalProfile } from '../models/ProfessionalProfile';
import type { PurchaseOrder } from '../models/PurchaseOrder';
import type { PurchaseOrderLine } from '../models/PurchaseOrderLine';
import type { RandomTest } from '../models/RandomTest';
import type { Receipt } from '../models/Receipt';
import type { ReceptionCheckin } from '../models/ReceptionCheckin';
import type { Reconciliation } from '../models/Reconciliation';
import type { ReplenishmentPlan } from '../models/ReplenishmentPlan';
import type { ReplenishmentSuggestion } from '../models/ReplenishmentSuggestion';
import type { ResultItem } from '../models/ResultItem';
import type { Sale } from '../models/Sale';
import type { SaleItem } from '../models/SaleItem';
import type { SalesOrder } from '../models/SalesOrder';
import type { SalesOrderLine } from '../models/SalesOrderLine';
import type { Sample } from '../models/Sample';
import type { SessionTokenObtainPair } from '../models/SessionTokenObtainPair';
import type { SessionTokenRefresh } from '../models/SessionTokenRefresh';
import type { Shipment } from '../models/Shipment';
import type { ShipmentLine } from '../models/ShipmentLine';
import type { Skill } from '../models/Skill';
import type { SmallSurgery } from '../models/SmallSurgery';
import type { StockLevel } from '../models/StockLevel';
import type { StockMovement } from '../models/StockMovement';
import type { StockReservation } from '../models/StockReservation';
import type { StockTransfer } from '../models/StockTransfer';
import type { StockTransferLine } from '../models/StockTransferLine';
import type { StorageLocation } from '../models/StorageLocation';
import type { StudentProfile } from '../models/StudentProfile';
import type { SubscriptionPlan } from '../models/SubscriptionPlan';
import type { Surgery } from '../models/Surgery';
import type { SurgicalProcedure } from '../models/SurgicalProcedure';
import type { SystemError } from '../models/SystemError';
import type { TeacherProfile } from '../models/TeacherProfile';
import type { Tenant } from '../models/Tenant';
import type { TenantConfiguration } from '../models/TenantConfiguration';
import type { TenantCoveragePlan } from '../models/TenantCoveragePlan';
import type { TenantUsage } from '../models/TenantUsage';
import type { Termination } from '../models/Termination';
import type { Transaction } from '../models/Transaction';
import type { User } from '../models/User';
import type { UserActivity } from '../models/UserActivity';
import type { UserAudit } from '../models/UserAudit';
import type { Vacation } from '../models/Vacation';
import type { Ward } from '../models/Ward';
import type { WardAdmission } from '../models/WardAdmission';
import type { WardBed } from '../models/WardBed';
import type { Warehouse } from '../models/Warehouse';
import type { WarehouseItem } from '../models/WarehouseItem';
import type { WarehouseItemCategory } from '../models/WarehouseItemCategory';
import type { WarehouseLot } from '../models/WarehouseLot';
import type { WorkSchedule } from '../models/WorkSchedule';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ApiService {
    /**
     * @returns any
     * @throws ApiError
     */
    public static listUsers(): CancelablePromise<Array<any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/auth/user/',
        });
    }
    /**
     * @param requestBody
     * @returns any
     * @throws ApiError
     */
    public static partialUpdateUser(
        requestBody?: any,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/auth/user/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static listAiAssistantSessions(): CancelablePromise<Array<any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/ai/assistant/sessions/',
        });
    }
    /**
     * @param sessionId
     * @returns any
     * @throws ApiError
     */
    public static retrieveAiAssistantSessionDetail(
        sessionId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/ai/assistant/sessions/{session_id}/',
            path: {
                'session_id': sessionId,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static listAiAssistantTools(): CancelablePromise<Array<any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/ai/assistant/tools/',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static listAiAssistantInvestigations(): CancelablePromise<Array<any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/ai/assistant/investigations/',
        });
    }
    /**
     * @param investigationId
     * @returns any
     * @throws ApiError
     */
    public static retrieveAiAssistantInvestigationDetail(
        investigationId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/ai/assistant/investigations/{investigation_id}/',
            path: {
                'investigation_id': investigationId,
            },
        });
    }
    /**
     * @param investigationId
     * @param requestBody
     * @returns any
     * @throws ApiError
     */
    public static partialUpdateAiAssistantInvestigationDetail(
        investigationId: string,
        requestBody?: any,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/ai/assistant/investigations/{investigation_id}/',
            path: {
                'investigation_id': investigationId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static listAiAssistantTasks(): CancelablePromise<Array<any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/ai/assistant/tasks/',
        });
    }
    /**
     * @param taskId
     * @returns any
     * @throws ApiError
     */
    public static retrieveAiAssistantTaskDetail(
        taskId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/ai/assistant/tasks/{task_id}/',
            path: {
                'task_id': taskId,
            },
        });
    }
    /**
     * @param taskId
     * @param requestBody
     * @returns any
     * @throws ApiError
     */
    public static partialUpdateAiAssistantTaskDetail(
        taskId: string,
        requestBody?: any,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/ai/assistant/tasks/{task_id}/',
            path: {
                'task_id': taskId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static listDashboardStats(): CancelablePromise<Array<any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/dashboard/stats/',
        });
    }
    /**
     * Gera PDF de actividade da página atual por janela temporal.
     * @returns any
     * @throws ApiError
     */
    public static listActivityReportPdfs(): CancelablePromise<Array<any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/audit/atividade/relatorio/pdf/',
        });
    }
    /**
     * Gera relatório PDF operacional para qualquer recurso/modelo da API.
     * @returns any
     * @throws ApiError
     */
    public static listModelActivityReportPdfs(): CancelablePromise<Array<any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/audit/modelo/relatorio/pdf/',
        });
    }
    /**
     * Worklist para equipamentos (HTTP JSON).
     *
     * Autenticação: header `X-Integration-Key`.
     * @param equipmentCustomId
     * @returns any
     * @throws ApiError
     */
    public static listEquipmentWorklists(
        equipmentCustomId: string,
    ): CancelablePromise<Array<any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/equipment_integrations/equipment/{equipment_custom_id}/worklist/',
            path: {
                'equipment_custom_id': equipmentCustomId,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns UserActivity
     * @throws ApiError
     */
    public static listUserActivities(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<UserActivity>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/audit/atividade/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns UserActivity
     * @throws ApiError
     */
    public static createUserActivity(
        requestBody?: UserActivity,
    ): CancelablePromise<UserActivity> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/audit/atividade/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Actividade do Utilizador.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns UserActivity
     * @throws ApiError
     */
    public static retrieveUserActivity(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<UserActivity> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/audit/atividade/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Actividade do Utilizador.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns UserActivity
     * @throws ApiError
     */
    public static updateUserActivity(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: UserActivity,
    ): CancelablePromise<UserActivity> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/audit/atividade/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Actividade do Utilizador.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns UserActivity
     * @throws ApiError
     */
    public static partialUpdateUserActivity(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: UserActivity,
    ): CancelablePromise<UserActivity> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/audit/atividade/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Actividade do Utilizador.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyUserActivity(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/audit/atividade/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * Lista usuários com contagem e última actividade registrada.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns UserAudit
     * @throws ApiError
     */
    public static listUsers1(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<UserAudit>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/audit/usuarios/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * Lista usuários com contagem e última actividade registrada.
     * @param id A unique integer value identifying this Usuário.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns UserAudit
     * @throws ApiError
     */
    public static retrieveUser(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<UserAudit> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/audit/usuarios/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * Painel de estatísticas (Top N) para o Administrador/Contabilidade.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns AnalyticsResponse
     * @throws ApiError
     */
    public static listLabRequests(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<AnalyticsResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/dashboard/analytics/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * Exporta o relatório do endpoint /dashboard/analytics/ em:
     * - PDF (type=pdf)
     * - CSV (type=csv)
     * - Word (type=word)
     * @returns AnalyticsResponse
     * @throws ApiError
     */
    public static exportLabRequest(): CancelablePromise<AnalyticsResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/dashboard/analytics/export/',
        });
    }
    /**
     * Viewset for laboratory exams.
     *
     * Available operations:
     * - LIST: list all exams with filters, search, and pagination
     * - CREATE: create a new exam
     * - RETRIEVE: fetch exam details
     * - UPDATE: fully update an exam
     * - DELETE: soft-delete an exam
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns LabExam
     * @throws ApiError
     */
    public static listLabExams(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<LabExam>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinical/exam/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * Viewset for laboratory exams.
     *
     * Available operations:
     * - LIST: list all exams with filters, search, and pagination
     * - CREATE: create a new exam
     * - RETRIEVE: fetch exam details
     * - UPDATE: fully update an exam
     * - DELETE: soft-delete an exam
     * @param requestBody
     * @returns LabExam
     * @throws ApiError
     */
    public static createLabExam(
        requestBody?: LabExam,
    ): CancelablePromise<LabExam> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/clinical/exam/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Viewset for laboratory exams.
     *
     * Available operations:
     * - LIST: list all exams with filters, search, and pagination
     * - CREATE: create a new exam
     * - RETRIEVE: fetch exam details
     * - UPDATE: fully update an exam
     * - DELETE: soft-delete an exam
     * @param id A unique integer value identifying this Exame.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns LabExam
     * @throws ApiError
     */
    public static retrieveLabExam(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<LabExam> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinical/exam/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * Viewset for laboratory exams.
     *
     * Available operations:
     * - LIST: list all exams with filters, search, and pagination
     * - CREATE: create a new exam
     * - RETRIEVE: fetch exam details
     * - UPDATE: fully update an exam
     * - DELETE: soft-delete an exam
     * @param id A unique integer value identifying this Exame.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns LabExam
     * @throws ApiError
     */
    public static updateLabExam(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: LabExam,
    ): CancelablePromise<LabExam> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/clinical/exam/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Viewset for laboratory exams.
     *
     * Available operations:
     * - LIST: list all exams with filters, search, and pagination
     * - CREATE: create a new exam
     * - RETRIEVE: fetch exam details
     * - UPDATE: fully update an exam
     * - DELETE: soft-delete an exam
     * @param id A unique integer value identifying this Exame.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns LabExam
     * @throws ApiError
     */
    public static partialUpdateLabExam(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: LabExam,
    ): CancelablePromise<LabExam> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/clinical/exam/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Viewset for laboratory exams.
     *
     * Available operations:
     * - LIST: list all exams with filters, search, and pagination
     * - CREATE: create a new exam
     * - RETRIEVE: fetch exam details
     * - UPDATE: fully update an exam
     * - DELETE: soft-delete an exam
     * @param id A unique integer value identifying this Exame.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyLabExam(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/clinical/exam/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * Viewset for laboratory exam fields.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns LabExamField
     * @throws ApiError
     */
    public static listLabExamFields(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<LabExamField>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinical/examfield/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * Viewset for laboratory exam fields.
     * @param requestBody
     * @returns LabExamField
     * @throws ApiError
     */
    public static createLabExamField(
        requestBody?: LabExamField,
    ): CancelablePromise<LabExamField> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/clinical/examfield/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Viewset for laboratory exam fields.
     * @param id A unique integer value identifying this parâmetro.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns LabExamField
     * @throws ApiError
     */
    public static retrieveLabExamField(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<LabExamField> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinical/examfield/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * Viewset for laboratory exam fields.
     * @param id A unique integer value identifying this parâmetro.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns LabExamField
     * @throws ApiError
     */
    public static updateLabExamField(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: LabExamField,
    ): CancelablePromise<LabExamField> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/clinical/examfield/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Viewset for laboratory exam fields.
     * @param id A unique integer value identifying this parâmetro.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns LabExamField
     * @throws ApiError
     */
    public static partialUpdateLabExamField(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: LabExamField,
    ): CancelablePromise<LabExamField> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/clinical/examfield/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Viewset for laboratory exam fields.
     * @param id A unique integer value identifying this parâmetro.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyLabExamField(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/clinical/examfield/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * Viewset for laboratory and medical requests.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns LabRequest
     * @throws ApiError
     */
    public static listLabRequests1(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<LabRequest>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinical/labrequest/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * Viewset for laboratory and medical requests.
     * @param requestBody
     * @returns LabRequest
     * @throws ApiError
     */
    public static createLabRequest(
        requestBody?: LabRequest,
    ): CancelablePromise<LabRequest> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/clinical/labrequest/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Viewset for laboratory and medical requests.
     * @param id A unique integer value identifying this Requisição de exam.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns LabRequest
     * @throws ApiError
     */
    public static retrieveLabRequest(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<LabRequest> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinical/labrequest/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * Viewset for laboratory and medical requests.
     * @param id A unique integer value identifying this Requisição de exam.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns LabRequest
     * @throws ApiError
     */
    public static updateLabRequest(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: LabRequest,
    ): CancelablePromise<LabRequest> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/clinical/labrequest/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Viewset for laboratory and medical requests.
     * @param id A unique integer value identifying this Requisição de exam.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns LabRequest
     * @throws ApiError
     */
    public static partialUpdateLabRequest(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: LabRequest,
    ): CancelablePromise<LabRequest> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/clinical/labrequest/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Viewset for laboratory and medical requests.
     * @param id A unique integer value identifying this Requisição de exam.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyLabRequest(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/clinical/labrequest/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * Return LAB result items with derived fields for inline entry/validation.
     * @param id A unique integer value identifying this Requisição de exam.
     * @returns LabRequest
     * @throws ApiError
     */
    public static resultItemsLabRequest(
        id: string,
    ): CancelablePromise<LabRequest> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinical/labrequest/{id}/result_itens/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Alias legado em português para compatibilidade do frontend.
     * @param id A unique integer value identifying this Requisição de exam.
     * @returns LabRequest
     * @throws ApiError
     */
    public static resultItemsLegacyLabRequest(
        id: string,
    ): CancelablePromise<LabRequest> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinical/labrequest/{id}/resultado_itens/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Generate the institutional PDF for validated laboratory results.
     *
     * Access is still restricted via RBAC to avoid accidental exposure.
     * @param id A unique integer value identifying this Requisição de exam.
     * @returns LabRequest
     * @throws ApiError
     */
    public static resultsPdfLabRequest(
        id: string,
    ): CancelablePromise<LabRequest> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinical/labrequest/{id}/pdf_resultados/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Viewset for request items.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns LabRequestItem
     * @throws ApiError
     */
    public static listLabRequestItems(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<LabRequestItem>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinical/labrequestitem/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * Viewset for request items.
     * @param requestBody
     * @returns LabRequestItem
     * @throws ApiError
     */
    public static createLabRequestItem(
        requestBody?: LabRequestItem,
    ): CancelablePromise<LabRequestItem> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/clinical/labrequestitem/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Viewset for request items.
     * @param id A unique integer value identifying this Item de requisição.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns LabRequestItem
     * @throws ApiError
     */
    public static retrieveLabRequestItem(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<LabRequestItem> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinical/labrequestitem/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * Viewset for request items.
     * @param id A unique integer value identifying this Item de requisição.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns LabRequestItem
     * @throws ApiError
     */
    public static updateLabRequestItem(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: LabRequestItem,
    ): CancelablePromise<LabRequestItem> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/clinical/labrequestitem/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Viewset for request items.
     * @param id A unique integer value identifying this Item de requisição.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns LabRequestItem
     * @throws ApiError
     */
    public static partialUpdateLabRequestItem(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: LabRequestItem,
    ): CancelablePromise<LabRequestItem> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/clinical/labrequestitem/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Viewset for request items.
     * @param id A unique integer value identifying this Item de requisição.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyLabRequestItem(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/clinical/labrequestitem/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns MedicalExam
     * @throws ApiError
     */
    public static listMedicalExams(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<MedicalExam>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinical/medicalexam/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns MedicalExam
     * @throws ApiError
     */
    public static createMedicalExam(
        requestBody?: MedicalExam,
    ): CancelablePromise<MedicalExam> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/clinical/medicalexam/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Exame médico.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns MedicalExam
     * @throws ApiError
     */
    public static retrieveMedicalExam(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<MedicalExam> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinical/medicalexam/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Exame médico.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns MedicalExam
     * @throws ApiError
     */
    public static updateMedicalExam(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: MedicalExam,
    ): CancelablePromise<MedicalExam> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/clinical/medicalexam/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Exame médico.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns MedicalExam
     * @throws ApiError
     */
    public static partialUpdateMedicalExam(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: MedicalExam,
    ): CancelablePromise<MedicalExam> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/clinical/medicalexam/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Exame médico.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyMedicalExam(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/clinical/medicalexam/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns MedicalExamField
     * @throws ApiError
     */
    public static listMedicalExamFields(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<MedicalExamField>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinical/medicalexamfield/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns MedicalExamField
     * @throws ApiError
     */
    public static createMedicalExamField(
        requestBody?: MedicalExamField,
    ): CancelablePromise<MedicalExamField> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/clinical/medicalexamfield/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this parâmetro de exam médico.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns MedicalExamField
     * @throws ApiError
     */
    public static retrieveMedicalExamField(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<MedicalExamField> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinical/medicalexamfield/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this parâmetro de exam médico.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns MedicalExamField
     * @throws ApiError
     */
    public static updateMedicalExamField(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: MedicalExamField,
    ): CancelablePromise<MedicalExamField> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/clinical/medicalexamfield/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this parâmetro de exam médico.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns MedicalExamField
     * @throws ApiError
     */
    public static partialUpdateMedicalExamField(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: MedicalExamField,
    ): CancelablePromise<MedicalExamField> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/clinical/medicalexamfield/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this parâmetro de exam médico.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyMedicalExamField(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/clinical/medicalexamfield/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns MedicalResultFile
     * @throws ApiError
     */
    public static listMedicalResultFiles(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<MedicalResultFile>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinical/medicalresultfile/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns MedicalResultFile
     * @throws ApiError
     */
    public static createMedicalResultFile(
        requestBody?: MedicalResultFile,
    ): CancelablePromise<MedicalResultFile> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/clinical/medicalresultfile/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Arquivo de result médico.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns MedicalResultFile
     * @throws ApiError
     */
    public static retrieveMedicalResultFile(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<MedicalResultFile> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinical/medicalresultfile/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Arquivo de result médico.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns MedicalResultFile
     * @throws ApiError
     */
    public static updateMedicalResultFile(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: MedicalResultFile,
    ): CancelablePromise<MedicalResultFile> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/clinical/medicalresultfile/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Arquivo de result médico.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns MedicalResultFile
     * @throws ApiError
     */
    public static partialUpdateMedicalResultFile(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: MedicalResultFile,
    ): CancelablePromise<MedicalResultFile> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/clinical/medicalresultfile/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Arquivo de result médico.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyMedicalResultFile(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/clinical/medicalresultfile/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * ViewSet para gerenciar pacientes.
     *
     * Campos principais:
     * - name: Nome completo (obrigatório)
     * - email: Email único para contato
     * - birth_date: Data de nascimento (para cálculo de idade)
     * - gender: Gênero (M/F)
     * - document_number: Documento de identidade (único)
     * - address: Endereço residencial
     * - pregnant: Indicador de gestação
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Patient
     * @throws ApiError
     */
    public static listPatients(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Patient>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinical/patient/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * ViewSet para gerenciar pacientes.
     *
     * Campos principais:
     * - name: Nome completo (obrigatório)
     * - email: Email único para contato
     * - birth_date: Data de nascimento (para cálculo de idade)
     * - gender: Gênero (M/F)
     * - document_number: Documento de identidade (único)
     * - address: Endereço residencial
     * - pregnant: Indicador de gestação
     * @param requestBody
     * @returns Patient
     * @throws ApiError
     */
    public static createPatient(
        requestBody?: Patient,
    ): CancelablePromise<Patient> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/clinical/patient/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Busca História Clínica por número de documento.
     * Ex.: /api/v1/clinical/patient/historia_clinica/?document_number=...
     * @returns Patient
     * @throws ApiError
     */
    public static historiaClinicaBuscaPatient(): CancelablePromise<Patient> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinical/patient/historia_clinica/',
        });
    }
    /**
     * ViewSet para gerenciar pacientes.
     *
     * Campos principais:
     * - name: Nome completo (obrigatório)
     * - email: Email único para contato
     * - birth_date: Data de nascimento (para cálculo de idade)
     * - gender: Gênero (M/F)
     * - document_number: Documento de identidade (único)
     * - address: Endereço residencial
     * - pregnant: Indicador de gestação
     * @param id A unique integer value identifying this Entrada.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Patient
     * @throws ApiError
     */
    public static retrievePatient(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Patient> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinical/patient/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * ViewSet para gerenciar pacientes.
     *
     * Campos principais:
     * - name: Nome completo (obrigatório)
     * - email: Email único para contato
     * - birth_date: Data de nascimento (para cálculo de idade)
     * - gender: Gênero (M/F)
     * - document_number: Documento de identidade (único)
     * - address: Endereço residencial
     * - pregnant: Indicador de gestação
     * @param id A unique integer value identifying this Entrada.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Patient
     * @throws ApiError
     */
    public static updatePatient(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Patient,
    ): CancelablePromise<Patient> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/clinical/patient/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * ViewSet para gerenciar pacientes.
     *
     * Campos principais:
     * - name: Nome completo (obrigatório)
     * - email: Email único para contato
     * - birth_date: Data de nascimento (para cálculo de idade)
     * - gender: Gênero (M/F)
     * - document_number: Documento de identidade (único)
     * - address: Endereço residencial
     * - pregnant: Indicador de gestação
     * @param id A unique integer value identifying this Entrada.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Patient
     * @throws ApiError
     */
    public static partialUpdatePatient(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Patient,
    ): CancelablePromise<Patient> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/clinical/patient/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * ViewSet para gerenciar pacientes.
     *
     * Campos principais:
     * - name: Nome completo (obrigatório)
     * - email: Email único para contato
     * - birth_date: Data de nascimento (para cálculo de idade)
     * - gender: Gênero (M/F)
     * - document_number: Documento de identidade (único)
     * - address: Endereço residencial
     * - pregnant: Indicador de gestação
     * @param id A unique integer value identifying this Entrada.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyPatient(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/clinical/patient/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * Alias em inglês para emissão do PDF de história clínica.
     * @param id A unique integer value identifying this Entrada.
     * @returns Patient
     * @throws ApiError
     */
    public static clinicalHistoryPdfPatient(
        id: string,
    ): CancelablePromise<Patient> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinical/patient/{id}/clinical_history/pdf/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * ViewSet para gerenciar pacientes.
     *
     * Campos principais:
     * - name: Nome completo (obrigatório)
     * - email: Email único para contato
     * - birth_date: Data de nascimento (para cálculo de idade)
     * - gender: Gênero (M/F)
     * - document_number: Documento de identidade (único)
     * - address: Endereço residencial
     * - pregnant: Indicador de gestação
     * @param id A unique integer value identifying this Entrada.
     * @returns Patient
     * @throws ApiError
     */
    public static historiaClinicaPatient(
        id: string,
    ): CancelablePromise<Patient> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinical/patient/{id}/historia_clinica/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Emite PDF do histórico clínico agregado do paciente.
     * @param id A unique integer value identifying this Entrada.
     * @returns Patient
     * @throws ApiError
     */
    public static historiaClinicaPdfPatient(
        id: string,
    ): CancelablePromise<Patient> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinical/patient/{id}/historia_clinica/pdf/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Emite PDF com histórico de faturas do paciente.
     * @param id A unique integer value identifying this Entrada.
     * @returns Patient
     * @throws ApiError
     */
    public static historiaFaturasPdfPatient(
        id: string,
    ): CancelablePromise<Patient> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinical/patient/{id}/historia_faturas/pdf/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Emite PDF com histórico de pagamentos do paciente.
     * @param id A unique integer value identifying this Entrada.
     * @returns Patient
     * @throws ApiError
     */
    public static historiaPagamentosPdfPatient(
        id: string,
    ): CancelablePromise<Patient> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinical/patient/{id}/historia_pagamentos/pdf/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Alias em inglês para emissão do PDF de histórico de faturas.
     * @param id A unique integer value identifying this Entrada.
     * @returns Patient
     * @throws ApiError
     */
    public static invoiceHistoryPdfPatient(
        id: string,
    ): CancelablePromise<Patient> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinical/patient/{id}/invoice_history/pdf/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Alias em inglês para emissão do PDF de histórico de pagamentos.
     * @param id A unique integer value identifying this Entrada.
     * @returns Patient
     * @throws ApiError
     */
    public static paymentHistoryPdfPatient(
        id: string,
    ): CancelablePromise<Patient> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinical/patient/{id}/payment_history/pdf/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Viewset for laboratory result items.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ResultItem
     * @throws ApiError
     */
    public static listResultItems(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<ResultItem>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinical/resultitem/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * Viewset for laboratory result items.
     * @param requestBody
     * @returns ResultItem
     * @throws ApiError
     */
    public static createResultItem(
        requestBody?: ResultItem,
    ): CancelablePromise<ResultItem> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/clinical/resultitem/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Viewset for laboratory result items.
     * @param id A unique integer value identifying this result item.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ResultItem
     * @throws ApiError
     */
    public static retrieveResultItem(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<ResultItem> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinical/resultitem/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * Viewset for laboratory result items.
     * @param id A unique integer value identifying this result item.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ResultItem
     * @throws ApiError
     */
    public static updateResultItem(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ResultItem,
    ): CancelablePromise<ResultItem> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/clinical/resultitem/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Viewset for laboratory result items.
     * @param id A unique integer value identifying this result item.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ResultItem
     * @throws ApiError
     */
    public static partialUpdateResultItem(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ResultItem,
    ): CancelablePromise<ResultItem> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/clinical/resultitem/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Viewset for laboratory result items.
     * @param id A unique integer value identifying this result item.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyResultItem(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/clinical/resultitem/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Sample
     * @throws ApiError
     */
    public static listSamples(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Sample>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinical/sample/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Sample
     * @throws ApiError
     */
    public static createSample(
        requestBody?: Sample,
    ): CancelablePromise<Sample> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/clinical/sample/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Amostra.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Sample
     * @throws ApiError
     */
    public static retrieveSample(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Sample> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/clinical/sample/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Amostra.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Sample
     * @throws ApiError
     */
    public static updateSample(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Sample,
    ): CancelablePromise<Sample> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/clinical/sample/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Amostra.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Sample
     * @throws ApiError
     */
    public static partialUpdateSample(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Sample,
    ): CancelablePromise<Sample> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/clinical/sample/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Amostra.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroySample(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/clinical/sample/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns MedicalConsultation
     * @throws ApiError
     */
    public static listMedicalConsultations(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<MedicalConsultation>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/consultations/consultation/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns MedicalConsultation
     * @throws ApiError
     */
    public static createMedicalConsultation(
        requestBody?: MedicalConsultation,
    ): CancelablePromise<MedicalConsultation> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/consultations/consultation/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Price preview for a specialty at a given date/time.
     *
     * Query params:
     * - specialty: id (required)
     * - scheduled_for: ISO datetime (optional; default: now)
     * - manual_holiday: bool (optional; default: False)
     * @returns MedicalConsultation
     * @throws ApiError
     */
    public static pricePreviewMedicalConsultation(): CancelablePromise<MedicalConsultation> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/consultations/consultation/price/',
        });
    }
    /**
     * @returns MedicalConsultation
     * @throws ApiError
     */
    public static pricePreviewLegacyMedicalConsultation(): CancelablePromise<MedicalConsultation> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/consultations/consultation/preco/',
        });
    }
    /**
     * List consultations by doctor and time range.
     *
     * Query params:
     * - doctor: user id (optional)
     * - start: ISO datetime (optional)
     * - end: ISO datetime (optional)
     * - status: MARCADA|CONCLUIDA|CANCELADA (optional)
     * @returns MedicalConsultation
     * @throws ApiError
     */
    public static scheduleMedicalConsultation(): CancelablePromise<MedicalConsultation> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/consultations/consultation/schedule/',
        });
    }
    /**
     * @returns MedicalConsultation
     * @throws ApiError
     */
    public static scheduleLegacyMedicalConsultation(): CancelablePromise<MedicalConsultation> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/consultations/consultation/agenda/',
        });
    }
    /**
     * @param id A unique integer value identifying this Consulta Médica.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns MedicalConsultation
     * @throws ApiError
     */
    public static retrieveMedicalConsultation(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<MedicalConsultation> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/consultations/consultation/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Consulta Médica.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns MedicalConsultation
     * @throws ApiError
     */
    public static updateMedicalConsultation(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: MedicalConsultation,
    ): CancelablePromise<MedicalConsultation> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/consultations/consultation/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Consulta Médica.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns MedicalConsultation
     * @throws ApiError
     */
    public static partialUpdateMedicalConsultation(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: MedicalConsultation,
    ): CancelablePromise<MedicalConsultation> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/consultations/consultation/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Consulta Médica.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyMedicalConsultation(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/consultations/consultation/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Consulta Médica.
     * @returns MedicalConsultation
     * @throws ApiError
     */
    public static clinicalHistoryMedicalConsultation(
        id: string,
    ): CancelablePromise<MedicalConsultation> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/consultations/consultation/{id}/clinical_history/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Alias em inglês para emissão do PDF de história clínica por consulta.
     * @param id A unique integer value identifying this Consulta Médica.
     * @returns MedicalConsultation
     * @throws ApiError
     */
    public static clinicalHistoryPdfMedicalConsultation(
        id: string,
    ): CancelablePromise<MedicalConsultation> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/consultations/consultation/{id}/clinical_history/pdf/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Retorna a história clínica agregada do paciente desta consulta.
     *
     * Este endpoint existe para evitar que o frontend faça várias chamadas e
     * consolide dados sensíveis localmente.
     * @param id A unique integer value identifying this Consulta Médica.
     * @returns MedicalConsultation
     * @throws ApiError
     */
    public static historiaClinicaMedicalConsultation(
        id: string,
    ): CancelablePromise<MedicalConsultation> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/consultations/consultation/{id}/historia_clinica/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Emite o PDF da história clínica agregada do paciente desta consulta.
     * @param id A unique integer value identifying this Consulta Médica.
     * @returns MedicalConsultation
     * @throws ApiError
     */
    public static historiaClinicaPdfMedicalConsultation(
        id: string,
    ): CancelablePromise<MedicalConsultation> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/consultations/consultation/{id}/historia_clinica/pdf/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Doctor
     * @throws ApiError
     */
    public static listEmployees(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Doctor>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/consultations/doctors/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Funcionário.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Doctor
     * @throws ApiError
     */
    public static retrieveEmployee(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Doctor> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/consultations/doctors/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Holiday
     * @throws ApiError
     */
    public static listHolidays(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Holiday>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/consultations/holiday/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Holiday
     * @throws ApiError
     */
    public static createHoliday(
        requestBody?: Holiday,
    ): CancelablePromise<Holiday> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/consultations/holiday/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Feriado.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Holiday
     * @throws ApiError
     */
    public static retrieveHoliday(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Holiday> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/consultations/holiday/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Feriado.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Holiday
     * @throws ApiError
     */
    public static updateHoliday(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Holiday,
    ): CancelablePromise<Holiday> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/consultations/holiday/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Feriado.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Holiday
     * @throws ApiError
     */
    public static partialUpdateHoliday(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Holiday,
    ): CancelablePromise<Holiday> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/consultations/holiday/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Feriado.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyHoliday(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/consultations/holiday/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ConsultationSpecialty
     * @throws ApiError
     */
    public static listConsultationSpecialties(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<ConsultationSpecialty>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/consultations/specialty/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns ConsultationSpecialty
     * @throws ApiError
     */
    public static createConsultationSpecialty(
        requestBody?: ConsultationSpecialty,
    ): CancelablePromise<ConsultationSpecialty> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/consultations/specialty/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Especialidade (Consulta).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ConsultationSpecialty
     * @throws ApiError
     */
    public static retrieveConsultationSpecialty(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<ConsultationSpecialty> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/consultations/specialty/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Especialidade (Consulta).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ConsultationSpecialty
     * @throws ApiError
     */
    public static updateConsultationSpecialty(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ConsultationSpecialty,
    ): CancelablePromise<ConsultationSpecialty> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/consultations/specialty/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Especialidade (Consulta).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ConsultationSpecialty
     * @throws ApiError
     */
    public static partialUpdateConsultationSpecialty(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ConsultationSpecialty,
    ): CancelablePromise<ConsultationSpecialty> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/consultations/specialty/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Especialidade (Consulta).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyConsultationSpecialty(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/consultations/specialty/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Account
     * @throws ApiError
     */
    public static listAccounts(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Account>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/accounting/account/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Account
     * @throws ApiError
     */
    public static createAccount(
        requestBody?: Account,
    ): CancelablePromise<Account> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/accounting/account/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Conta contábil.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Account
     * @throws ApiError
     */
    public static retrieveAccount(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Account> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/accounting/account/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Conta contábil.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Account
     * @throws ApiError
     */
    public static updateAccount(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Account,
    ): CancelablePromise<Account> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/accounting/account/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Conta contábil.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Account
     * @throws ApiError
     */
    public static partialUpdateAccount(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Account,
    ): CancelablePromise<Account> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/accounting/account/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Conta contábil.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyAccount(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/accounting/account/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns LedgerEntry
     * @throws ApiError
     */
    public static listLegacyEntries(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<LedgerEntry>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/accounting/entry/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns LedgerEntry
     * @throws ApiError
     */
    public static createLegacyEntry(
        requestBody?: LedgerEntry,
    ): CancelablePromise<LedgerEntry> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/accounting/entry/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Lançamento legado.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns LedgerEntry
     * @throws ApiError
     */
    public static retrieveLegacyEntry(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<LedgerEntry> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/accounting/entry/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Lançamento legado.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns LedgerEntry
     * @throws ApiError
     */
    public static updateLegacyEntry(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: LedgerEntry,
    ): CancelablePromise<LedgerEntry> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/accounting/entry/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Lançamento legado.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns LedgerEntry
     * @throws ApiError
     */
    public static partialUpdateLegacyEntry(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: LedgerEntry,
    ): CancelablePromise<LedgerEntry> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/accounting/entry/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Lançamento legado.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyLegacyEntry(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/accounting/entry/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns FinancialReconciliation
     * @throws ApiError
     */
    public static listFinancialReconciliations(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<FinancialReconciliation>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/accounting/financialreconciliation/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns FinancialReconciliation
     * @throws ApiError
     */
    public static createFinancialReconciliation(
        requestBody?: FinancialReconciliation,
    ): CancelablePromise<FinancialReconciliation> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/accounting/financialreconciliation/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Conciliação financeira.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns FinancialReconciliation
     * @throws ApiError
     */
    public static retrieveFinancialReconciliation(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<FinancialReconciliation> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/accounting/financialreconciliation/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Conciliação financeira.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns FinancialReconciliation
     * @throws ApiError
     */
    public static updateFinancialReconciliation(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: FinancialReconciliation,
    ): CancelablePromise<FinancialReconciliation> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/accounting/financialreconciliation/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Conciliação financeira.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns FinancialReconciliation
     * @throws ApiError
     */
    public static partialUpdateFinancialReconciliation(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: FinancialReconciliation,
    ): CancelablePromise<FinancialReconciliation> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/accounting/financialreconciliation/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Conciliação financeira.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyFinancialReconciliation(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/accounting/financialreconciliation/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns LedgerMovement
     * @throws ApiError
     */
    public static listLegacyMovements(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<LedgerMovement>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/accounting/movement/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns LedgerMovement
     * @throws ApiError
     */
    public static createLegacyMovement(
        requestBody?: LedgerMovement,
    ): CancelablePromise<LedgerMovement> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/accounting/movement/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Movimento legado.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns LedgerMovement
     * @throws ApiError
     */
    public static retrieveLegacyMovement(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<LedgerMovement> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/accounting/movement/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Movimento legado.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns LedgerMovement
     * @throws ApiError
     */
    public static updateLegacyMovement(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: LedgerMovement,
    ): CancelablePromise<LedgerMovement> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/accounting/movement/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Movimento legado.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns LedgerMovement
     * @throws ApiError
     */
    public static partialUpdateLegacyMovement(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: LedgerMovement,
    ): CancelablePromise<LedgerMovement> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/accounting/movement/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Movimento legado.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyLegacyMovement(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/accounting/movement/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns NursingEvolution
     * @throws ApiError
     */
    public static listNursingEvolutions(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<NursingEvolution>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/nursing/nursing_evolution/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns NursingEvolution
     * @throws ApiError
     */
    public static createNursingEvolution(
        requestBody?: NursingEvolution,
    ): CancelablePromise<NursingEvolution> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/nursing/nursing_evolution/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Evolução de Enfermagem.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns NursingEvolution
     * @throws ApiError
     */
    public static retrieveNursingEvolution(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<NursingEvolution> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/nursing/nursing_evolution/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Evolução de Enfermagem.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns NursingEvolution
     * @throws ApiError
     */
    public static updateNursingEvolution(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: NursingEvolution,
    ): CancelablePromise<NursingEvolution> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/nursing/nursing_evolution/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Evolução de Enfermagem.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns NursingEvolution
     * @throws ApiError
     */
    public static partialUpdateNursingEvolution(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: NursingEvolution,
    ): CancelablePromise<NursingEvolution> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/nursing/nursing_evolution/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Evolução de Enfermagem.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyNursingEvolution(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/nursing/nursing_evolution/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns NursingPrescription
     * @throws ApiError
     */
    public static listNursingPrescriptions(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<NursingPrescription>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/nursing/nursing_prescription/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns NursingPrescription
     * @throws ApiError
     */
    public static createNursingPrescription(
        requestBody?: NursingPrescription,
    ): CancelablePromise<NursingPrescription> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/nursing/nursing_prescription/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Prescrição de Enfermagem.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns NursingPrescription
     * @throws ApiError
     */
    public static retrieveNursingPrescription(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<NursingPrescription> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/nursing/nursing_prescription/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Prescrição de Enfermagem.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns NursingPrescription
     * @throws ApiError
     */
    public static updateNursingPrescription(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: NursingPrescription,
    ): CancelablePromise<NursingPrescription> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/nursing/nursing_prescription/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Prescrição de Enfermagem.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns NursingPrescription
     * @throws ApiError
     */
    public static partialUpdateNursingPrescription(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: NursingPrescription,
    ): CancelablePromise<NursingPrescription> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/nursing/nursing_prescription/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Prescrição de Enfermagem.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyNursingPrescription(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/nursing/nursing_prescription/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns NursingRecord
     * @throws ApiError
     */
    public static listNursingRecords(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<NursingRecord>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/nursing/nursing_record/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns NursingRecord
     * @throws ApiError
     */
    public static createNursingRecord(
        requestBody?: NursingRecord,
    ): CancelablePromise<NursingRecord> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/nursing/nursing_record/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Registro de Enfermagem.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns NursingRecord
     * @throws ApiError
     */
    public static retrieveNursingRecord(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<NursingRecord> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/nursing/nursing_record/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Registro de Enfermagem.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns NursingRecord
     * @throws ApiError
     */
    public static updateNursingRecord(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: NursingRecord,
    ): CancelablePromise<NursingRecord> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/nursing/nursing_record/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Registro de Enfermagem.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns NursingRecord
     * @throws ApiError
     */
    public static partialUpdateNursingRecord(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: NursingRecord,
    ): CancelablePromise<NursingRecord> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/nursing/nursing_record/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Registro de Enfermagem.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyNursingRecord(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/nursing/nursing_record/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns NursingVitalSign
     * @throws ApiError
     */
    public static listNursingVitalSigns(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<NursingVitalSign>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/nursing/nursing_vital_sign/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns NursingVitalSign
     * @throws ApiError
     */
    public static createNursingVitalSign(
        requestBody?: NursingVitalSign,
    ): CancelablePromise<NursingVitalSign> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/nursing/nursing_vital_sign/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Sinal Vital.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns NursingVitalSign
     * @throws ApiError
     */
    public static retrieveNursingVitalSign(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<NursingVitalSign> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/nursing/nursing_vital_sign/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Sinal Vital.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns NursingVitalSign
     * @throws ApiError
     */
    public static updateNursingVitalSign(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: NursingVitalSign,
    ): CancelablePromise<NursingVitalSign> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/nursing/nursing_vital_sign/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Sinal Vital.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns NursingVitalSign
     * @throws ApiError
     */
    public static partialUpdateNursingVitalSign(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: NursingVitalSign,
    ): CancelablePromise<NursingVitalSign> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/nursing/nursing_vital_sign/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Sinal Vital.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyNursingVitalSign(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/nursing/nursing_vital_sign/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Procedure
     * @throws ApiError
     */
    public static listProcedures(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Procedure>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/nursing/procedure/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Procedure
     * @throws ApiError
     */
    public static createProcedure(
        requestBody?: Procedure,
    ): CancelablePromise<Procedure> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/nursing/procedure/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Procedimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Procedure
     * @throws ApiError
     */
    public static retrieveProcedure(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Procedure> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/nursing/procedure/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Procedimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Procedure
     * @throws ApiError
     */
    public static updateProcedure(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Procedure,
    ): CancelablePromise<Procedure> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/nursing/procedure/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Procedimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Procedure
     * @throws ApiError
     */
    public static partialUpdateProcedure(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Procedure,
    ): CancelablePromise<Procedure> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/nursing/procedure/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Procedimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyProcedure(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/nursing/procedure/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * Gera o PDF institucional do procedimento de enfermagem com detalhes clínicos e financeiros.
     * @param id A unique integer value identifying this Procedimento.
     * @returns Procedure
     * @throws ApiError
     */
    public static pdfProcedure(
        id: string,
    ): CancelablePromise<Procedure> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/nursing/procedure/{id}/pdf/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ProcedureCatalog
     * @throws ApiError
     */
    public static listProcedureCatalogs(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<ProcedureCatalog>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/nursing/procedure_catalog/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns ProcedureCatalog
     * @throws ApiError
     */
    public static createProcedureCatalog(
        requestBody?: ProcedureCatalog,
    ): CancelablePromise<ProcedureCatalog> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/nursing/procedure_catalog/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Catálogo de Procedimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ProcedureCatalog
     * @throws ApiError
     */
    public static retrieveProcedureCatalog(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<ProcedureCatalog> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/nursing/procedure_catalog/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Catálogo de Procedimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ProcedureCatalog
     * @throws ApiError
     */
    public static updateProcedureCatalog(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ProcedureCatalog,
    ): CancelablePromise<ProcedureCatalog> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/nursing/procedure_catalog/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Catálogo de Procedimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ProcedureCatalog
     * @throws ApiError
     */
    public static partialUpdateProcedureCatalog(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ProcedureCatalog,
    ): CancelablePromise<ProcedureCatalog> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/nursing/procedure_catalog/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Catálogo de Procedimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyProcedureCatalog(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/nursing/procedure_catalog/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ProcedureCatalogMaterial
     * @throws ApiError
     */
    public static listProcedureCatalogMaterials(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<ProcedureCatalogMaterial>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/nursing/procedure_catalog_material/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns ProcedureCatalogMaterial
     * @throws ApiError
     */
    public static createProcedureCatalogMaterial(
        requestBody?: ProcedureCatalogMaterial,
    ): CancelablePromise<ProcedureCatalogMaterial> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/nursing/procedure_catalog_material/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Material de Procedimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ProcedureCatalogMaterial
     * @throws ApiError
     */
    public static retrieveProcedureCatalogMaterial(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<ProcedureCatalogMaterial> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/nursing/procedure_catalog_material/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Material de Procedimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ProcedureCatalogMaterial
     * @throws ApiError
     */
    public static updateProcedureCatalogMaterial(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ProcedureCatalogMaterial,
    ): CancelablePromise<ProcedureCatalogMaterial> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/nursing/procedure_catalog_material/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Material de Procedimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ProcedureCatalogMaterial
     * @throws ApiError
     */
    public static partialUpdateProcedureCatalogMaterial(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ProcedureCatalogMaterial,
    ): CancelablePromise<ProcedureCatalogMaterial> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/nursing/procedure_catalog_material/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Material de Procedimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyProcedureCatalogMaterial(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/nursing/procedure_catalog_material/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ProcedureItem
     * @throws ApiError
     */
    public static listProcedureItems(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<ProcedureItem>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/nursing/procedure_item/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns ProcedureItem
     * @throws ApiError
     */
    public static createProcedureItem(
        requestBody?: ProcedureItem,
    ): CancelablePromise<ProcedureItem> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/nursing/procedure_item/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Procedimento de Enfermagem - Item.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ProcedureItem
     * @throws ApiError
     */
    public static retrieveProcedureItem(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<ProcedureItem> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/nursing/procedure_item/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * P1.3: CRÍTICO - Prevenir modificações diretas via PATCH/PUT em campos críticos.
     * Use state transition endpoints (execute, complete, etc.).
     * @param id A unique integer value identifying this Procedimento de Enfermagem - Item.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ProcedureItem
     * @throws ApiError
     */
    public static updateProcedureItem(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ProcedureItem,
    ): CancelablePromise<ProcedureItem> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/nursing/procedure_item/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Procedimento de Enfermagem - Item.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ProcedureItem
     * @throws ApiError
     */
    public static partialUpdateProcedureItem(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ProcedureItem,
    ): CancelablePromise<ProcedureItem> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/nursing/procedure_item/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Procedimento de Enfermagem - Item.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyProcedureItem(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/nursing/procedure_item/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ProcedureItemValue
     * @throws ApiError
     */
    public static listProcedureItemValues(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<ProcedureItemValue>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/nursing/procedure_item_value/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns ProcedureItemValue
     * @throws ApiError
     */
    public static createProcedureItemValue(
        requestBody?: ProcedureItemValue,
    ): CancelablePromise<ProcedureItemValue> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/nursing/procedure_item_value/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Valor do Item de Procedimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ProcedureItemValue
     * @throws ApiError
     */
    public static retrieveProcedureItemValue(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<ProcedureItemValue> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/nursing/procedure_item_value/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Valor do Item de Procedimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ProcedureItemValue
     * @throws ApiError
     */
    public static updateProcedureItemValue(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ProcedureItemValue,
    ): CancelablePromise<ProcedureItemValue> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/nursing/procedure_item_value/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Valor do Item de Procedimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ProcedureItemValue
     * @throws ApiError
     */
    public static partialUpdateProcedureItemValue(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ProcedureItemValue,
    ): CancelablePromise<ProcedureItemValue> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/nursing/procedure_item_value/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Valor do Item de Procedimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyProcedureItemValue(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/nursing/procedure_item_value/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ProcedureMaterial
     * @throws ApiError
     */
    public static listProcedureMaterials(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<ProcedureMaterial>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/nursing/procedure_material/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns ProcedureMaterial
     * @throws ApiError
     */
    public static createProcedureMaterial(
        requestBody?: ProcedureMaterial,
    ): CancelablePromise<ProcedureMaterial> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/nursing/procedure_material/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Material do Procedimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ProcedureMaterial
     * @throws ApiError
     */
    public static retrieveProcedureMaterial(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<ProcedureMaterial> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/nursing/procedure_material/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Material do Procedimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ProcedureMaterial
     * @throws ApiError
     */
    public static updateProcedureMaterial(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ProcedureMaterial,
    ): CancelablePromise<ProcedureMaterial> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/nursing/procedure_material/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Material do Procedimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ProcedureMaterial
     * @throws ApiError
     */
    public static partialUpdateProcedureMaterial(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ProcedureMaterial,
    ): CancelablePromise<ProcedureMaterial> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/nursing/procedure_material/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Material do Procedimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyProcedureMaterial(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/nursing/procedure_material/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ProcedureMaterialValue
     * @throws ApiError
     */
    public static listProcedureMaterialValues(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<ProcedureMaterialValue>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/nursing/procedure_material_value/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns ProcedureMaterialValue
     * @throws ApiError
     */
    public static createProcedureMaterialValue(
        requestBody?: ProcedureMaterialValue,
    ): CancelablePromise<ProcedureMaterialValue> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/nursing/procedure_material_value/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Valor do Material do Procedimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ProcedureMaterialValue
     * @throws ApiError
     */
    public static retrieveProcedureMaterialValue(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<ProcedureMaterialValue> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/nursing/procedure_material_value/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Valor do Material do Procedimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ProcedureMaterialValue
     * @throws ApiError
     */
    public static updateProcedureMaterialValue(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ProcedureMaterialValue,
    ): CancelablePromise<ProcedureMaterialValue> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/nursing/procedure_material_value/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Valor do Material do Procedimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ProcedureMaterialValue
     * @throws ApiError
     */
    public static partialUpdateProcedureMaterialValue(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ProcedureMaterialValue,
    ): CancelablePromise<ProcedureMaterialValue> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/nursing/procedure_material_value/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Valor do Material do Procedimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyProcedureMaterialValue(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/nursing/procedure_material_value/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Ward
     * @throws ApiError
     */
    public static listWards(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Ward>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/nursing/ward/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Ward
     * @throws ApiError
     */
    public static createWard(
        requestBody?: Ward,
    ): CancelablePromise<Ward> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/nursing/ward/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Enfermaria.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Ward
     * @throws ApiError
     */
    public static retrieveWard(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Ward> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/nursing/ward/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Enfermaria.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Ward
     * @throws ApiError
     */
    public static updateWard(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Ward,
    ): CancelablePromise<Ward> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/nursing/ward/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Enfermaria.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Ward
     * @throws ApiError
     */
    public static partialUpdateWard(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Ward,
    ): CancelablePromise<Ward> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/nursing/ward/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Enfermaria.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyWard(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/nursing/ward/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns WardAdmission
     * @throws ApiError
     */
    public static listWardAdmissions(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<WardAdmission>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/nursing/ward_admission/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns WardAdmission
     * @throws ApiError
     */
    public static createWardAdmission(
        requestBody?: WardAdmission,
    ): CancelablePromise<WardAdmission> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/nursing/ward_admission/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Internamento (Enfermaria).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns WardAdmission
     * @throws ApiError
     */
    public static retrieveWardAdmission(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<WardAdmission> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/nursing/ward_admission/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Internamento (Enfermaria).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns WardAdmission
     * @throws ApiError
     */
    public static updateWardAdmission(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: WardAdmission,
    ): CancelablePromise<WardAdmission> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/nursing/ward_admission/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Internamento (Enfermaria).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns WardAdmission
     * @throws ApiError
     */
    public static partialUpdateWardAdmission(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: WardAdmission,
    ): CancelablePromise<WardAdmission> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/nursing/ward_admission/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Internamento (Enfermaria).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyWardAdmission(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/nursing/ward_admission/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns WardBed
     * @throws ApiError
     */
    public static listWardBeds(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<WardBed>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/nursing/ward_bed/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns WardBed
     * @throws ApiError
     */
    public static createWardBed(
        requestBody?: WardBed,
    ): CancelablePromise<WardBed> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/nursing/ward_bed/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Cama.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns WardBed
     * @throws ApiError
     */
    public static retrieveWardBed(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<WardBed> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/nursing/ward_bed/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Cama.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns WardBed
     * @throws ApiError
     */
    public static updateWardBed(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: WardBed,
    ): CancelablePromise<WardBed> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/nursing/ward_bed/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Cama.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns WardBed
     * @throws ApiError
     */
    public static partialUpdateWardBed(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: WardBed,
    ): CancelablePromise<WardBed> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/nursing/ward_bed/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Cama.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyWardBed(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/nursing/ward_bed/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * Operational ward dashboard (occupancy + upcoming medications).
     * @returns any
     * @throws ApiError
     */
    public static listWardDashboardViewSets(): CancelablePromise<Array<any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/nursing/ward_dashboard/',
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns DailyInspection
     * @throws ApiError
     */
    public static listDailyInspections(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<DailyInspection>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/equipment/daily_inspection/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns DailyInspection
     * @throws ApiError
     */
    public static createDailyInspection(
        requestBody?: DailyInspection,
    ): CancelablePromise<DailyInspection> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/equipment/daily_inspection/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Inspeção Diária.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns DailyInspection
     * @throws ApiError
     */
    public static retrieveDailyInspection(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<DailyInspection> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/equipment/daily_inspection/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Inspeção Diária.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns DailyInspection
     * @throws ApiError
     */
    public static updateDailyInspection(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: DailyInspection,
    ): CancelablePromise<DailyInspection> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/equipment/daily_inspection/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Inspeção Diária.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns DailyInspection
     * @throws ApiError
     */
    public static partialUpdateDailyInspection(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: DailyInspection,
    ): CancelablePromise<DailyInspection> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/equipment/daily_inspection/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Inspeção Diária.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyDailyInspection(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/equipment/daily_inspection/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Equipment
     * @throws ApiError
     */
    public static listEquipment(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Equipment>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/equipment/equipment/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Equipment
     * @throws ApiError
     */
    public static createEquipment(
        requestBody?: Equipment,
    ): CancelablePromise<Equipment> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/equipment/equipment/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Equipamento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Equipment
     * @throws ApiError
     */
    public static retrieveEquipment(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Equipment> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/equipment/equipment/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Equipamento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Equipment
     * @throws ApiError
     */
    public static updateEquipment(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Equipment,
    ): CancelablePromise<Equipment> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/equipment/equipment/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Equipamento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Equipment
     * @throws ApiError
     */
    public static partialUpdateEquipment(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Equipment,
    ): CancelablePromise<Equipment> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/equipment/equipment/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Equipamento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyEquipment(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/equipment/equipment/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Incident
     * @throws ApiError
     */
    public static listIncidents(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Incident>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/equipment/incident/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Incident
     * @throws ApiError
     */
    public static createIncident(
        requestBody?: Incident,
    ): CancelablePromise<Incident> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/equipment/incident/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Ocorrência.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Incident
     * @throws ApiError
     */
    public static retrieveIncident(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Incident> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/equipment/incident/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Ocorrência.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Incident
     * @throws ApiError
     */
    public static updateIncident(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Incident,
    ): CancelablePromise<Incident> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/equipment/incident/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Ocorrência.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Incident
     * @throws ApiError
     */
    public static partialUpdateIncident(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Incident,
    ): CancelablePromise<Incident> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/equipment/incident/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Ocorrência.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyIncident(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/equipment/incident/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns IntegrationAnalyteMapping
     * @throws ApiError
     */
    public static listIntegrationAnalyteMappings(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<IntegrationAnalyteMapping>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/equipment_integrations/analyte_mapping/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns IntegrationAnalyteMapping
     * @throws ApiError
     */
    public static createIntegrationAnalyteMapping(
        requestBody?: IntegrationAnalyteMapping,
    ): CancelablePromise<IntegrationAnalyteMapping> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/equipment_integrations/analyte_mapping/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Mapeamento de analito.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns IntegrationAnalyteMapping
     * @throws ApiError
     */
    public static retrieveIntegrationAnalyteMapping(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<IntegrationAnalyteMapping> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/equipment_integrations/analyte_mapping/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Mapeamento de analito.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns IntegrationAnalyteMapping
     * @throws ApiError
     */
    public static updateIntegrationAnalyteMapping(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: IntegrationAnalyteMapping,
    ): CancelablePromise<IntegrationAnalyteMapping> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/equipment_integrations/analyte_mapping/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Mapeamento de analito.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns IntegrationAnalyteMapping
     * @throws ApiError
     */
    public static partialUpdateIntegrationAnalyteMapping(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: IntegrationAnalyteMapping,
    ): CancelablePromise<IntegrationAnalyteMapping> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/equipment_integrations/analyte_mapping/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Mapeamento de analito.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyIntegrationAnalyteMapping(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/equipment_integrations/analyte_mapping/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns IntegrationCredential
     * @throws ApiError
     */
    public static listIntegrationCredentials(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<IntegrationCredential>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/equipment_integrations/credential/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns IntegrationCredential
     * @throws ApiError
     */
    public static createIntegrationCredential(
        requestBody?: IntegrationCredential,
    ): CancelablePromise<IntegrationCredential> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/equipment_integrations/credential/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Credencial (Equipamento).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns IntegrationCredential
     * @throws ApiError
     */
    public static retrieveIntegrationCredential(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<IntegrationCredential> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/equipment_integrations/credential/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Credencial (Equipamento).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns IntegrationCredential
     * @throws ApiError
     */
    public static updateIntegrationCredential(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: IntegrationCredential,
    ): CancelablePromise<IntegrationCredential> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/equipment_integrations/credential/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Credencial (Equipamento).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns IntegrationCredential
     * @throws ApiError
     */
    public static partialUpdateIntegrationCredential(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: IntegrationCredential,
    ): CancelablePromise<IntegrationCredential> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/equipment_integrations/credential/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Credencial (Equipamento).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyIntegrationCredential(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/equipment_integrations/credential/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns IntegrationDocument
     * @throws ApiError
     */
    public static listIntegrationDocuments(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<IntegrationDocument>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/equipment_integrations/document/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns IntegrationDocument
     * @throws ApiError
     */
    public static createIntegrationDocument(
        requestBody?: IntegrationDocument,
    ): CancelablePromise<IntegrationDocument> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/equipment_integrations/document/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Documento (Integração).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns IntegrationDocument
     * @throws ApiError
     */
    public static retrieveIntegrationDocument(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<IntegrationDocument> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/equipment_integrations/document/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Documento (Integração).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns IntegrationDocument
     * @throws ApiError
     */
    public static updateIntegrationDocument(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: IntegrationDocument,
    ): CancelablePromise<IntegrationDocument> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/equipment_integrations/document/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Documento (Integração).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns IntegrationDocument
     * @throws ApiError
     */
    public static partialUpdateIntegrationDocument(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: IntegrationDocument,
    ): CancelablePromise<IntegrationDocument> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/equipment_integrations/document/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Documento (Integração).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyIntegrationDocument(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/equipment_integrations/document/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns IntegrationEquipment
     * @throws ApiError
     */
    public static listIntegrationEquipments(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<IntegrationEquipment>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/equipment_integrations/equipment/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns IntegrationEquipment
     * @throws ApiError
     */
    public static createIntegrationEquipment(
        requestBody?: IntegrationEquipment,
    ): CancelablePromise<IntegrationEquipment> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/equipment_integrations/equipment/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Equipamento (Integração).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns IntegrationEquipment
     * @throws ApiError
     */
    public static retrieveIntegrationEquipment(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<IntegrationEquipment> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/equipment_integrations/equipment/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Equipamento (Integração).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns IntegrationEquipment
     * @throws ApiError
     */
    public static updateIntegrationEquipment(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: IntegrationEquipment,
    ): CancelablePromise<IntegrationEquipment> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/equipment_integrations/equipment/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Equipamento (Integração).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns IntegrationEquipment
     * @throws ApiError
     */
    public static partialUpdateIntegrationEquipment(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: IntegrationEquipment,
    ): CancelablePromise<IntegrationEquipment> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/equipment_integrations/equipment/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Equipamento (Integração).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyIntegrationEquipment(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/equipment_integrations/equipment/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns IntegrationMessage
     * @throws ApiError
     */
    public static listIntegrationMessages(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<IntegrationMessage>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/equipment_integrations/message/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns IntegrationMessage
     * @throws ApiError
     */
    public static createIntegrationMessage(
        requestBody?: IntegrationMessage,
    ): CancelablePromise<IntegrationMessage> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/equipment_integrations/message/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Mensagem (Integração).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns IntegrationMessage
     * @throws ApiError
     */
    public static retrieveIntegrationMessage(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<IntegrationMessage> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/equipment_integrations/message/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Mensagem (Integração).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns IntegrationMessage
     * @throws ApiError
     */
    public static updateIntegrationMessage(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: IntegrationMessage,
    ): CancelablePromise<IntegrationMessage> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/equipment_integrations/message/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Mensagem (Integração).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns IntegrationMessage
     * @throws ApiError
     */
    public static partialUpdateIntegrationMessage(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: IntegrationMessage,
    ): CancelablePromise<IntegrationMessage> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/equipment_integrations/message/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Mensagem (Integração).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyIntegrationMessage(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/equipment_integrations/message/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns IntegrationOrder
     * @throws ApiError
     */
    public static listIntegrationOrders(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<IntegrationOrder>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/equipment_integrations/order/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns IntegrationOrder
     * @throws ApiError
     */
    public static createIntegrationOrder(
        requestBody?: IntegrationOrder,
    ): CancelablePromise<IntegrationOrder> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/equipment_integrations/order/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Ordem (Integração).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns IntegrationOrder
     * @throws ApiError
     */
    public static retrieveIntegrationOrder(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<IntegrationOrder> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/equipment_integrations/order/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Ordem (Integração).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns IntegrationOrder
     * @throws ApiError
     */
    public static updateIntegrationOrder(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: IntegrationOrder,
    ): CancelablePromise<IntegrationOrder> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/equipment_integrations/order/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Ordem (Integração).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns IntegrationOrder
     * @throws ApiError
     */
    public static partialUpdateIntegrationOrder(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: IntegrationOrder,
    ): CancelablePromise<IntegrationOrder> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/equipment_integrations/order/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Ordem (Integração).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyIntegrationOrder(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/equipment_integrations/order/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns IntegrationOrderItem
     * @throws ApiError
     */
    public static listIntegrationOrderItems(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<IntegrationOrderItem>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/equipment_integrations/order_item/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns IntegrationOrderItem
     * @throws ApiError
     */
    public static createIntegrationOrderItem(
        requestBody?: IntegrationOrderItem,
    ): CancelablePromise<IntegrationOrderItem> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/equipment_integrations/order_item/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Item de order (Integração).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns IntegrationOrderItem
     * @throws ApiError
     */
    public static retrieveIntegrationOrderItem(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<IntegrationOrderItem> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/equipment_integrations/order_item/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Item de order (Integração).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns IntegrationOrderItem
     * @throws ApiError
     */
    public static updateIntegrationOrderItem(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: IntegrationOrderItem,
    ): CancelablePromise<IntegrationOrderItem> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/equipment_integrations/order_item/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Item de order (Integração).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns IntegrationOrderItem
     * @throws ApiError
     */
    public static partialUpdateIntegrationOrderItem(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: IntegrationOrderItem,
    ): CancelablePromise<IntegrationOrderItem> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/equipment_integrations/order_item/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Item de order (Integração).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyIntegrationOrderItem(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/equipment_integrations/order_item/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns IntegrationRouting
     * @throws ApiError
     */
    public static listIntegrationRoutings(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<IntegrationRouting>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/equipment_integrations/routing/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns IntegrationRouting
     * @throws ApiError
     */
    public static createIntegrationRouting(
        requestBody?: IntegrationRouting,
    ): CancelablePromise<IntegrationRouting> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/equipment_integrations/routing/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Roteamento (Integração).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns IntegrationRouting
     * @throws ApiError
     */
    public static retrieveIntegrationRouting(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<IntegrationRouting> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/equipment_integrations/routing/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Roteamento (Integração).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns IntegrationRouting
     * @throws ApiError
     */
    public static updateIntegrationRouting(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: IntegrationRouting,
    ): CancelablePromise<IntegrationRouting> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/equipment_integrations/routing/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Roteamento (Integração).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns IntegrationRouting
     * @throws ApiError
     */
    public static partialUpdateIntegrationRouting(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: IntegrationRouting,
    ): CancelablePromise<IntegrationRouting> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/equipment_integrations/routing/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Roteamento (Integração).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyIntegrationRouting(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/equipment_integrations/routing/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Empresa
     * @throws ApiError
     */
    public static listCompanies(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Empresa>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/external_entities/empresa/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Empresa
     * @throws ApiError
     */
    public static createCompany(
        requestBody?: Empresa,
    ): CancelablePromise<Empresa> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/external_entities/empresa/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Empresa.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Empresa
     * @throws ApiError
     */
    public static retrieveCompany(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Empresa> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/external_entities/empresa/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Empresa.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Empresa
     * @throws ApiError
     */
    public static updateCompany(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Empresa,
    ): CancelablePromise<Empresa> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/external_entities/empresa/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Empresa.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Empresa
     * @throws ApiError
     */
    public static partialUpdateCompany(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Empresa,
    ): CancelablePromise<Empresa> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/external_entities/empresa/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Empresa.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyCompany(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/external_entities/empresa/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns InventoryMovement
     * @throws ApiError
     */
    public static listInventoryMovements(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<InventoryMovement>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/pharmacy/inventory_movement/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns InventoryMovement
     * @throws ApiError
     */
    public static createInventoryMovement(
        requestBody?: InventoryMovement,
    ): CancelablePromise<InventoryMovement> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/pharmacy/inventory_movement/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Gera PDF de histórico de entradas/saídas/ajustes.
     * @returns InventoryMovement
     * @throws ApiError
     */
    public static historyPdfInventoryMovement(): CancelablePromise<InventoryMovement> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/pharmacy/inventory_movement/history/pdf/',
        });
    }
    /**
     * @param id A unique integer value identifying this Movimento de estoque.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns InventoryMovement
     * @throws ApiError
     */
    public static retrieveInventoryMovement(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<InventoryMovement> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/pharmacy/inventory_movement/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Movimento de estoque.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns InventoryMovement
     * @throws ApiError
     */
    public static updateInventoryMovement(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: InventoryMovement,
    ): CancelablePromise<InventoryMovement> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/pharmacy/inventory_movement/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Movimento de estoque.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns InventoryMovement
     * @throws ApiError
     */
    public static partialUpdateInventoryMovement(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: InventoryMovement,
    ): CancelablePromise<InventoryMovement> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/pharmacy/inventory_movement/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Movimento de estoque.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyInventoryMovement(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/pharmacy/inventory_movement/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Lot
     * @throws ApiError
     */
    public static listLots(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Lot>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/pharmacy/lot/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Lot
     * @throws ApiError
     */
    public static createLot(
        requestBody?: Lot,
    ): CancelablePromise<Lot> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/pharmacy/lot/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Lista lotes FEFO com saldo > 0 e não vencidos.
     * Útil para criação de requisições internas (logística).
     * @returns Lot
     * @throws ApiError
     */
    public static availableLot(): CancelablePromise<Lot> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/pharmacy/lot/available/',
        });
    }
    /**
     * Gera PDF do estoque existente (assíncrono).
     * @returns Lot
     * @throws ApiError
     */
    public static stockPdfLot(): CancelablePromise<Lot> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/pharmacy/lot/stock/pdf/',
        });
    }
    /**
     * @param id A unique integer value identifying this Lote.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Lot
     * @throws ApiError
     */
    public static retrieveLot(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Lot> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/pharmacy/lot/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Lote.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Lot
     * @throws ApiError
     */
    public static updateLot(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Lot,
    ): CancelablePromise<Lot> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/pharmacy/lot/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Lote.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Lot
     * @throws ApiError
     */
    public static partialUpdateLot(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Lot,
    ): CancelablePromise<Lot> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/pharmacy/lot/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Lote.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyLot(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/pharmacy/lot/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns MaterialRequisition
     * @throws ApiError
     */
    public static listMaterialRequisitions(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<MaterialRequisition>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/pharmacy/material_requisition/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns MaterialRequisition
     * @throws ApiError
     */
    public static createMaterialRequisition(
        requestBody?: MaterialRequisition,
    ): CancelablePromise<MaterialRequisition> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/pharmacy/material_requisition/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * PDF de movimentos de insumos por setor solicitante.
     * Uso principal: equipe da farmácia.
     * @returns MaterialRequisition
     * @throws ApiError
     */
    public static movementHistoryPdfMaterialRequisition(): CancelablePromise<MaterialRequisition> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/pharmacy/material_requisition/movement-history/pdf/',
        });
    }
    /**
     * @returns MaterialRequisition
     * @throws ApiError
     */
    public static requesterContextMaterialRequisition(): CancelablePromise<MaterialRequisition> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/pharmacy/material_requisition/requester-context/',
        });
    }
    /**
     * @param id A unique integer value identifying this Requisição de material.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns MaterialRequisition
     * @throws ApiError
     */
    public static retrieveMaterialRequisition(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<MaterialRequisition> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/pharmacy/material_requisition/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Requisição de material.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns MaterialRequisition
     * @throws ApiError
     */
    public static updateMaterialRequisition(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: MaterialRequisition,
    ): CancelablePromise<MaterialRequisition> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/pharmacy/material_requisition/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Requisição de material.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns MaterialRequisition
     * @throws ApiError
     */
    public static partialUpdateMaterialRequisition(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: MaterialRequisition,
    ): CancelablePromise<MaterialRequisition> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/pharmacy/material_requisition/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Requisição de material.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyMaterialRequisition(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/pharmacy/material_requisition/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns MaterialRequisitionItem
     * @throws ApiError
     */
    public static listMaterialRequisitionItems(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<MaterialRequisitionItem>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/pharmacy/material_requisition_item/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns MaterialRequisitionItem
     * @throws ApiError
     */
    public static createMaterialRequisitionItem(
        requestBody?: MaterialRequisitionItem,
    ): CancelablePromise<MaterialRequisitionItem> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/pharmacy/material_requisition_item/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Item da requisição de material.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns MaterialRequisitionItem
     * @throws ApiError
     */
    public static retrieveMaterialRequisitionItem(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<MaterialRequisitionItem> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/pharmacy/material_requisition_item/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Item da requisição de material.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns MaterialRequisitionItem
     * @throws ApiError
     */
    public static updateMaterialRequisitionItem(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: MaterialRequisitionItem,
    ): CancelablePromise<MaterialRequisitionItem> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/pharmacy/material_requisition_item/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Item da requisição de material.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns MaterialRequisitionItem
     * @throws ApiError
     */
    public static partialUpdateMaterialRequisitionItem(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: MaterialRequisitionItem,
    ): CancelablePromise<MaterialRequisitionItem> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/pharmacy/material_requisition_item/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Item da requisição de material.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyMaterialRequisitionItem(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/pharmacy/material_requisition_item/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Product
     * @throws ApiError
     */
    public static listProducts(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Product>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/pharmacy/product/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Product
     * @throws ApiError
     */
    public static createProduct(
        requestBody?: Product,
    ): CancelablePromise<Product> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/pharmacy/product/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * PDF com os produtos menos requisitados (baseado em requisições de material).
     * @returns Product
     * @throws ApiError
     */
    public static leastRequestedProductsPdfProduct(): CancelablePromise<Product> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/pharmacy/product/least-requested/pdf/',
        });
    }
    /**
     * PDF com os produtos mais requisitados (baseado em requisições de material).
     * @returns Product
     * @throws ApiError
     */
    public static mostRequestedProductsPdfProduct(): CancelablePromise<Product> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/pharmacy/product/most-requested/pdf/',
        });
    }
    /**
     * PDF de consumo farmacêutico consolidado por produto.
     * @returns Product
     * @throws ApiError
     */
    public static productConsumptionPdfProduct(): CancelablePromise<Product> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/pharmacy/product/consumption/pdf/',
        });
    }
    /**
     * PDF com os setores que mais requisitaram um produto específico.
     * @returns Product
     * @throws ApiError
     */
    public static productSectorDemandPdfProduct(): CancelablePromise<Product> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/pharmacy/product/request-sectors/pdf/',
        });
    }
    /**
     * @param id A unique integer value identifying this Produto.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Product
     * @throws ApiError
     */
    public static retrieveProduct(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Product> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/pharmacy/product/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Produto.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Product
     * @throws ApiError
     */
    public static updateProduct(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Product,
    ): CancelablePromise<Product> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/pharmacy/product/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Produto.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Product
     * @throws ApiError
     */
    public static partialUpdateProduct(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Product,
    ): CancelablePromise<Product> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/pharmacy/product/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Produto.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyProduct(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/pharmacy/product/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Sale
     * @throws ApiError
     */
    public static listSales(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Sale>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/pharmacy/sale/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Sale
     * @throws ApiError
     */
    public static createSale(
        requestBody?: Sale,
    ): CancelablePromise<Sale> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/pharmacy/sale/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Venda.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Sale
     * @throws ApiError
     */
    public static retrieveSale(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Sale> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/pharmacy/sale/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Venda.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Sale
     * @throws ApiError
     */
    public static updateSale(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Sale,
    ): CancelablePromise<Sale> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/pharmacy/sale/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Venda.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Sale
     * @throws ApiError
     */
    public static partialUpdateSale(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Sale,
    ): CancelablePromise<Sale> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/pharmacy/sale/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Venda.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroySale(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/pharmacy/sale/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns SaleItem
     * @throws ApiError
     */
    public static listSaleItems(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<SaleItem>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/pharmacy/sale_item/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns SaleItem
     * @throws ApiError
     */
    public static createSaleItem(
        requestBody?: SaleItem,
    ): CancelablePromise<SaleItem> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/pharmacy/sale_item/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Item de Venda.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns SaleItem
     * @throws ApiError
     */
    public static retrieveSaleItem(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<SaleItem> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/pharmacy/sale_item/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Item de Venda.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns SaleItem
     * @throws ApiError
     */
    public static updateSaleItem(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: SaleItem,
    ): CancelablePromise<SaleItem> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/pharmacy/sale_item/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Item de Venda.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns SaleItem
     * @throws ApiError
     */
    public static partialUpdateSaleItem(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: SaleItem,
    ): CancelablePromise<SaleItem> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/pharmacy/sale_item/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Item de Venda.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroySaleItem(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/pharmacy/sale_item/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns CycleCount
     * @throws ApiError
     */
    public static listCycleCounts(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<CycleCount>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/cycle_count/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns CycleCount
     * @throws ApiError
     */
    public static createCycleCount(
        requestBody?: CycleCount,
    ): CancelablePromise<CycleCount> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/warehouse/cycle_count/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Inventário Cíclico.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns CycleCount
     * @throws ApiError
     */
    public static retrieveCycleCount(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<CycleCount> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/cycle_count/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Inventário Cíclico.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns CycleCount
     * @throws ApiError
     */
    public static updateCycleCount(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: CycleCount,
    ): CancelablePromise<CycleCount> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/warehouse/cycle_count/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Inventário Cíclico.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns CycleCount
     * @throws ApiError
     */
    public static partialUpdateCycleCount(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: CycleCount,
    ): CancelablePromise<CycleCount> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/warehouse/cycle_count/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Inventário Cíclico.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyCycleCount(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/warehouse/cycle_count/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns CycleCountLine
     * @throws ApiError
     */
    public static listCycleCountLines(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<CycleCountLine>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/cycle_count_line/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns CycleCountLine
     * @throws ApiError
     */
    public static createCycleCountLine(
        requestBody?: CycleCountLine,
    ): CancelablePromise<CycleCountLine> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/warehouse/cycle_count_line/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Linha de Inventário.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns CycleCountLine
     * @throws ApiError
     */
    public static retrieveCycleCountLine(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<CycleCountLine> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/cycle_count_line/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Linha de Inventário.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns CycleCountLine
     * @throws ApiError
     */
    public static updateCycleCountLine(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: CycleCountLine,
    ): CancelablePromise<CycleCountLine> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/warehouse/cycle_count_line/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Linha de Inventário.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns CycleCountLine
     * @throws ApiError
     */
    public static partialUpdateCycleCountLine(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: CycleCountLine,
    ): CancelablePromise<CycleCountLine> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/warehouse/cycle_count_line/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Linha de Inventário.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyCycleCountLine(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/warehouse/cycle_count_line/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns GoodsReceipt
     * @throws ApiError
     */
    public static listGoodsReceipts(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<GoodsReceipt>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/goods_receipt/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns GoodsReceipt
     * @throws ApiError
     */
    public static createGoodsReceipt(
        requestBody?: GoodsReceipt,
    ): CancelablePromise<GoodsReceipt> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/warehouse/goods_receipt/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Recebimento de Compra.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns GoodsReceipt
     * @throws ApiError
     */
    public static retrieveGoodsReceipt(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<GoodsReceipt> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/goods_receipt/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Recebimento de Compra.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns GoodsReceipt
     * @throws ApiError
     */
    public static updateGoodsReceipt(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: GoodsReceipt,
    ): CancelablePromise<GoodsReceipt> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/warehouse/goods_receipt/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Recebimento de Compra.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns GoodsReceipt
     * @throws ApiError
     */
    public static partialUpdateGoodsReceipt(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: GoodsReceipt,
    ): CancelablePromise<GoodsReceipt> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/warehouse/goods_receipt/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Recebimento de Compra.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyGoodsReceipt(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/warehouse/goods_receipt/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns GoodsReceiptLine
     * @throws ApiError
     */
    public static listGoodsReceiptLines(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<GoodsReceiptLine>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/goods_receipt_line/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns GoodsReceiptLine
     * @throws ApiError
     */
    public static createGoodsReceiptLine(
        requestBody?: GoodsReceiptLine,
    ): CancelablePromise<GoodsReceiptLine> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/warehouse/goods_receipt_line/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Linha de Recebimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns GoodsReceiptLine
     * @throws ApiError
     */
    public static retrieveGoodsReceiptLine(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<GoodsReceiptLine> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/goods_receipt_line/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Linha de Recebimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns GoodsReceiptLine
     * @throws ApiError
     */
    public static updateGoodsReceiptLine(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: GoodsReceiptLine,
    ): CancelablePromise<GoodsReceiptLine> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/warehouse/goods_receipt_line/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Linha de Recebimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns GoodsReceiptLine
     * @throws ApiError
     */
    public static partialUpdateGoodsReceiptLine(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: GoodsReceiptLine,
    ): CancelablePromise<GoodsReceiptLine> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/warehouse/goods_receipt_line/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Linha de Recebimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyGoodsReceiptLine(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/warehouse/goods_receipt_line/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns WarehouseItem
     * @throws ApiError
     */
    public static listWarehouseItems(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<WarehouseItem>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/item/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns WarehouseItem
     * @throws ApiError
     */
    public static createWarehouseItem(
        requestBody?: WarehouseItem,
    ): CancelablePromise<WarehouseItem> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/warehouse/item/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Item de Estoque.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns WarehouseItem
     * @throws ApiError
     */
    public static retrieveWarehouseItem(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<WarehouseItem> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/item/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Item de Estoque.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns WarehouseItem
     * @throws ApiError
     */
    public static updateWarehouseItem(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: WarehouseItem,
    ): CancelablePromise<WarehouseItem> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/warehouse/item/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Item de Estoque.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns WarehouseItem
     * @throws ApiError
     */
    public static partialUpdateWarehouseItem(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: WarehouseItem,
    ): CancelablePromise<WarehouseItem> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/warehouse/item/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Item de Estoque.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyWarehouseItem(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/warehouse/item/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns WarehouseItemCategory
     * @throws ApiError
     */
    public static listWarehouseItemCategories(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<WarehouseItemCategory>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/item_category/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns WarehouseItemCategory
     * @throws ApiError
     */
    public static createWarehouseItemCategory(
        requestBody?: WarehouseItemCategory,
    ): CancelablePromise<WarehouseItemCategory> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/warehouse/item_category/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Categoria de Item.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns WarehouseItemCategory
     * @throws ApiError
     */
    public static retrieveWarehouseItemCategory(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<WarehouseItemCategory> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/item_category/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Categoria de Item.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns WarehouseItemCategory
     * @throws ApiError
     */
    public static updateWarehouseItemCategory(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: WarehouseItemCategory,
    ): CancelablePromise<WarehouseItemCategory> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/warehouse/item_category/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Categoria de Item.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns WarehouseItemCategory
     * @throws ApiError
     */
    public static partialUpdateWarehouseItemCategory(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: WarehouseItemCategory,
    ): CancelablePromise<WarehouseItemCategory> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/warehouse/item_category/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Categoria de Item.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyWarehouseItemCategory(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/warehouse/item_category/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns WarehouseLot
     * @throws ApiError
     */
    public static listWarehouseLots(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<WarehouseLot>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/lot/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns WarehouseLot
     * @throws ApiError
     */
    public static createWarehouseLot(
        requestBody?: WarehouseLot,
    ): CancelablePromise<WarehouseLot> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/warehouse/lot/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Lote WMS.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns WarehouseLot
     * @throws ApiError
     */
    public static retrieveWarehouseLot(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<WarehouseLot> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/lot/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Lote WMS.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns WarehouseLot
     * @throws ApiError
     */
    public static updateWarehouseLot(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: WarehouseLot,
    ): CancelablePromise<WarehouseLot> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/warehouse/lot/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Lote WMS.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns WarehouseLot
     * @throws ApiError
     */
    public static partialUpdateWarehouseLot(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: WarehouseLot,
    ): CancelablePromise<WarehouseLot> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/warehouse/lot/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Lote WMS.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyWarehouseLot(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/warehouse/lot/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns PickList
     * @throws ApiError
     */
    public static listPickLists(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<PickList>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/pick_list/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns PickList
     * @throws ApiError
     */
    public static createPickList(
        requestBody?: PickList,
    ): CancelablePromise<PickList> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/warehouse/pick_list/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Lista de Separação.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns PickList
     * @throws ApiError
     */
    public static retrievePickList(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<PickList> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/pick_list/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Lista de Separação.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns PickList
     * @throws ApiError
     */
    public static updatePickList(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: PickList,
    ): CancelablePromise<PickList> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/warehouse/pick_list/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Lista de Separação.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns PickList
     * @throws ApiError
     */
    public static partialUpdatePickList(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: PickList,
    ): CancelablePromise<PickList> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/warehouse/pick_list/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Lista de Separação.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyPickList(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/warehouse/pick_list/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns PickListLine
     * @throws ApiError
     */
    public static listPickListLines(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<PickListLine>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/pick_list_line/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns PickListLine
     * @throws ApiError
     */
    public static createPickListLine(
        requestBody?: PickListLine,
    ): CancelablePromise<PickListLine> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/warehouse/pick_list_line/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Linha de Separação.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns PickListLine
     * @throws ApiError
     */
    public static retrievePickListLine(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<PickListLine> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/pick_list_line/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Linha de Separação.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns PickListLine
     * @throws ApiError
     */
    public static updatePickListLine(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: PickListLine,
    ): CancelablePromise<PickListLine> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/warehouse/pick_list_line/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Linha de Separação.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns PickListLine
     * @throws ApiError
     */
    public static partialUpdatePickListLine(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: PickListLine,
    ): CancelablePromise<PickListLine> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/warehouse/pick_list_line/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Linha de Separação.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyPickListLine(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/warehouse/pick_list_line/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns PurchaseOrder
     * @throws ApiError
     */
    public static listPurchaseOrders(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<PurchaseOrder>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/purchase_order/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns PurchaseOrder
     * @throws ApiError
     */
    public static createPurchaseOrder(
        requestBody?: PurchaseOrder,
    ): CancelablePromise<PurchaseOrder> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/warehouse/purchase_order/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Pedido de Compra.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns PurchaseOrder
     * @throws ApiError
     */
    public static retrievePurchaseOrder(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<PurchaseOrder> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/purchase_order/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Pedido de Compra.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns PurchaseOrder
     * @throws ApiError
     */
    public static updatePurchaseOrder(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: PurchaseOrder,
    ): CancelablePromise<PurchaseOrder> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/warehouse/purchase_order/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Pedido de Compra.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns PurchaseOrder
     * @throws ApiError
     */
    public static partialUpdatePurchaseOrder(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: PurchaseOrder,
    ): CancelablePromise<PurchaseOrder> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/warehouse/purchase_order/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Pedido de Compra.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyPurchaseOrder(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/warehouse/purchase_order/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns PurchaseOrderLine
     * @throws ApiError
     */
    public static listPurchaseOrderLines(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<PurchaseOrderLine>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/purchase_order_line/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns PurchaseOrderLine
     * @throws ApiError
     */
    public static createPurchaseOrderLine(
        requestBody?: PurchaseOrderLine,
    ): CancelablePromise<PurchaseOrderLine> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/warehouse/purchase_order_line/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Linha de Pedido de Compra.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns PurchaseOrderLine
     * @throws ApiError
     */
    public static retrievePurchaseOrderLine(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<PurchaseOrderLine> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/purchase_order_line/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Linha de Pedido de Compra.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns PurchaseOrderLine
     * @throws ApiError
     */
    public static updatePurchaseOrderLine(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: PurchaseOrderLine,
    ): CancelablePromise<PurchaseOrderLine> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/warehouse/purchase_order_line/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Linha de Pedido de Compra.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns PurchaseOrderLine
     * @throws ApiError
     */
    public static partialUpdatePurchaseOrderLine(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: PurchaseOrderLine,
    ): CancelablePromise<PurchaseOrderLine> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/warehouse/purchase_order_line/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Linha de Pedido de Compra.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyPurchaseOrderLine(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/warehouse/purchase_order_line/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ReplenishmentPlan
     * @throws ApiError
     */
    public static listReplenishmentPlans(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<ReplenishmentPlan>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/replenishment_plan/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns ReplenishmentPlan
     * @throws ApiError
     */
    public static createReplenishmentPlan(
        requestBody?: ReplenishmentPlan,
    ): CancelablePromise<ReplenishmentPlan> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/warehouse/replenishment_plan/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Plano de Reposição.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ReplenishmentPlan
     * @throws ApiError
     */
    public static retrieveReplenishmentPlan(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<ReplenishmentPlan> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/replenishment_plan/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Plano de Reposição.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ReplenishmentPlan
     * @throws ApiError
     */
    public static updateReplenishmentPlan(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ReplenishmentPlan,
    ): CancelablePromise<ReplenishmentPlan> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/warehouse/replenishment_plan/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Plano de Reposição.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ReplenishmentPlan
     * @throws ApiError
     */
    public static partialUpdateReplenishmentPlan(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ReplenishmentPlan,
    ): CancelablePromise<ReplenishmentPlan> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/warehouse/replenishment_plan/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Plano de Reposição.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyReplenishmentPlan(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/warehouse/replenishment_plan/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ReplenishmentSuggestion
     * @throws ApiError
     */
    public static listReplenishmentSuggestions(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<ReplenishmentSuggestion>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/replenishment_suggestion/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns ReplenishmentSuggestion
     * @throws ApiError
     */
    public static createReplenishmentSuggestion(
        requestBody?: ReplenishmentSuggestion,
    ): CancelablePromise<ReplenishmentSuggestion> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/warehouse/replenishment_suggestion/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Sugestão de Reposição.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ReplenishmentSuggestion
     * @throws ApiError
     */
    public static retrieveReplenishmentSuggestion(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<ReplenishmentSuggestion> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/replenishment_suggestion/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Sugestão de Reposição.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ReplenishmentSuggestion
     * @throws ApiError
     */
    public static updateReplenishmentSuggestion(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ReplenishmentSuggestion,
    ): CancelablePromise<ReplenishmentSuggestion> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/warehouse/replenishment_suggestion/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Sugestão de Reposição.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ReplenishmentSuggestion
     * @throws ApiError
     */
    public static partialUpdateReplenishmentSuggestion(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ReplenishmentSuggestion,
    ): CancelablePromise<ReplenishmentSuggestion> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/warehouse/replenishment_suggestion/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Sugestão de Reposição.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyReplenishmentSuggestion(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/warehouse/replenishment_suggestion/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns SalesOrder
     * @throws ApiError
     */
    public static listSalesOrders(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<SalesOrder>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/sales_order/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns SalesOrder
     * @throws ApiError
     */
    public static createSalesOrder(
        requestBody?: SalesOrder,
    ): CancelablePromise<SalesOrder> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/warehouse/sales_order/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Pedido de Venda.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns SalesOrder
     * @throws ApiError
     */
    public static retrieveSalesOrder(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<SalesOrder> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/sales_order/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Pedido de Venda.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns SalesOrder
     * @throws ApiError
     */
    public static updateSalesOrder(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: SalesOrder,
    ): CancelablePromise<SalesOrder> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/warehouse/sales_order/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Pedido de Venda.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns SalesOrder
     * @throws ApiError
     */
    public static partialUpdateSalesOrder(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: SalesOrder,
    ): CancelablePromise<SalesOrder> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/warehouse/sales_order/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Pedido de Venda.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroySalesOrder(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/warehouse/sales_order/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns SalesOrderLine
     * @throws ApiError
     */
    public static listSalesOrderLines(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<SalesOrderLine>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/sales_order_line/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns SalesOrderLine
     * @throws ApiError
     */
    public static createSalesOrderLine(
        requestBody?: SalesOrderLine,
    ): CancelablePromise<SalesOrderLine> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/warehouse/sales_order_line/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Linha de Pedido de Venda.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns SalesOrderLine
     * @throws ApiError
     */
    public static retrieveSalesOrderLine(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<SalesOrderLine> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/sales_order_line/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Linha de Pedido de Venda.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns SalesOrderLine
     * @throws ApiError
     */
    public static updateSalesOrderLine(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: SalesOrderLine,
    ): CancelablePromise<SalesOrderLine> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/warehouse/sales_order_line/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Linha de Pedido de Venda.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns SalesOrderLine
     * @throws ApiError
     */
    public static partialUpdateSalesOrderLine(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: SalesOrderLine,
    ): CancelablePromise<SalesOrderLine> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/warehouse/sales_order_line/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Linha de Pedido de Venda.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroySalesOrderLine(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/warehouse/sales_order_line/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Shipment
     * @throws ApiError
     */
    public static listShipments(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Shipment>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/shipment/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Shipment
     * @throws ApiError
     */
    public static createShipment(
        requestBody?: Shipment,
    ): CancelablePromise<Shipment> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/warehouse/shipment/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Expedição.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Shipment
     * @throws ApiError
     */
    public static retrieveShipment(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Shipment> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/shipment/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Expedição.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Shipment
     * @throws ApiError
     */
    public static updateShipment(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Shipment,
    ): CancelablePromise<Shipment> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/warehouse/shipment/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Expedição.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Shipment
     * @throws ApiError
     */
    public static partialUpdateShipment(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Shipment,
    ): CancelablePromise<Shipment> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/warehouse/shipment/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Expedição.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyShipment(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/warehouse/shipment/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ShipmentLine
     * @throws ApiError
     */
    public static listShipmentLines(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<ShipmentLine>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/shipment_line/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns ShipmentLine
     * @throws ApiError
     */
    public static createShipmentLine(
        requestBody?: ShipmentLine,
    ): CancelablePromise<ShipmentLine> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/warehouse/shipment_line/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Linha de Expedição.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ShipmentLine
     * @throws ApiError
     */
    public static retrieveShipmentLine(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<ShipmentLine> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/shipment_line/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Linha de Expedição.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ShipmentLine
     * @throws ApiError
     */
    public static updateShipmentLine(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ShipmentLine,
    ): CancelablePromise<ShipmentLine> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/warehouse/shipment_line/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Linha de Expedição.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ShipmentLine
     * @throws ApiError
     */
    public static partialUpdateShipmentLine(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ShipmentLine,
    ): CancelablePromise<ShipmentLine> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/warehouse/shipment_line/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Linha de Expedição.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyShipmentLine(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/warehouse/shipment_line/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns StockLevel
     * @throws ApiError
     */
    public static listStockLevels(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<StockLevel>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/stock_level/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Saldo de Estoque.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns StockLevel
     * @throws ApiError
     */
    public static retrieveStockLevel(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<StockLevel> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/stock_level/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns StockMovement
     * @throws ApiError
     */
    public static listStockMovements(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<StockMovement>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/stock_movement/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns StockMovement
     * @throws ApiError
     */
    public static createStockMovement(
        requestBody?: StockMovement,
    ): CancelablePromise<StockMovement> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/warehouse/stock_movement/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Movimento WMS.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns StockMovement
     * @throws ApiError
     */
    public static retrieveStockMovement(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<StockMovement> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/stock_movement/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Movimento WMS.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns StockMovement
     * @throws ApiError
     */
    public static updateStockMovement(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: StockMovement,
    ): CancelablePromise<StockMovement> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/warehouse/stock_movement/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Movimento WMS.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns StockMovement
     * @throws ApiError
     */
    public static partialUpdateStockMovement(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: StockMovement,
    ): CancelablePromise<StockMovement> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/warehouse/stock_movement/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Movimento WMS.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyStockMovement(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/warehouse/stock_movement/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns StockReservation
     * @throws ApiError
     */
    public static listStockReservations(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<StockReservation>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/stock_reservation/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns StockReservation
     * @throws ApiError
     */
    public static createStockReservation(
        requestBody?: StockReservation,
    ): CancelablePromise<StockReservation> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/warehouse/stock_reservation/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Reserva de Estoque.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns StockReservation
     * @throws ApiError
     */
    public static retrieveStockReservation(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<StockReservation> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/stock_reservation/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns StockTransfer
     * @throws ApiError
     */
    public static listStockTransfers(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<StockTransfer>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/stock_transfer/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns StockTransfer
     * @throws ApiError
     */
    public static createStockTransfer(
        requestBody?: StockTransfer,
    ): CancelablePromise<StockTransfer> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/warehouse/stock_transfer/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Transferência de Estoque.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns StockTransfer
     * @throws ApiError
     */
    public static retrieveStockTransfer(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<StockTransfer> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/stock_transfer/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Transferência de Estoque.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns StockTransfer
     * @throws ApiError
     */
    public static updateStockTransfer(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: StockTransfer,
    ): CancelablePromise<StockTransfer> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/warehouse/stock_transfer/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Transferência de Estoque.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns StockTransfer
     * @throws ApiError
     */
    public static partialUpdateStockTransfer(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: StockTransfer,
    ): CancelablePromise<StockTransfer> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/warehouse/stock_transfer/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Transferência de Estoque.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyStockTransfer(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/warehouse/stock_transfer/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns StockTransferLine
     * @throws ApiError
     */
    public static listStockTransferLines(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<StockTransferLine>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/stock_transfer_line/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns StockTransferLine
     * @throws ApiError
     */
    public static createStockTransferLine(
        requestBody?: StockTransferLine,
    ): CancelablePromise<StockTransferLine> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/warehouse/stock_transfer_line/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Linha de Transferência.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns StockTransferLine
     * @throws ApiError
     */
    public static retrieveStockTransferLine(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<StockTransferLine> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/stock_transfer_line/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Linha de Transferência.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns StockTransferLine
     * @throws ApiError
     */
    public static updateStockTransferLine(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: StockTransferLine,
    ): CancelablePromise<StockTransferLine> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/warehouse/stock_transfer_line/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Linha de Transferência.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns StockTransferLine
     * @throws ApiError
     */
    public static partialUpdateStockTransferLine(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: StockTransferLine,
    ): CancelablePromise<StockTransferLine> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/warehouse/stock_transfer_line/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Linha de Transferência.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyStockTransferLine(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/warehouse/stock_transfer_line/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns StorageLocation
     * @throws ApiError
     */
    public static listStorageLocations(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<StorageLocation>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/storage_location/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns StorageLocation
     * @throws ApiError
     */
    public static createStorageLocation(
        requestBody?: StorageLocation,
    ): CancelablePromise<StorageLocation> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/warehouse/storage_location/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Localização de Armazém.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns StorageLocation
     * @throws ApiError
     */
    public static retrieveStorageLocation(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<StorageLocation> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/storage_location/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Localização de Armazém.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns StorageLocation
     * @throws ApiError
     */
    public static updateStorageLocation(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: StorageLocation,
    ): CancelablePromise<StorageLocation> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/warehouse/storage_location/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Localização de Armazém.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns StorageLocation
     * @throws ApiError
     */
    public static partialUpdateStorageLocation(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: StorageLocation,
    ): CancelablePromise<StorageLocation> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/warehouse/storage_location/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Localização de Armazém.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyStorageLocation(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/warehouse/storage_location/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Warehouse
     * @throws ApiError
     */
    public static listWarehouses(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Warehouse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/warehouse/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Warehouse
     * @throws ApiError
     */
    public static createWarehouse(
        requestBody?: Warehouse,
    ): CancelablePromise<Warehouse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/warehouse/warehouse/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Armazém.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Warehouse
     * @throws ApiError
     */
    public static retrieveWarehouse(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Warehouse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/warehouse/warehouse/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Armazém.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Warehouse
     * @throws ApiError
     */
    public static updateWarehouse(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Warehouse,
    ): CancelablePromise<Warehouse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/warehouse/warehouse/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Armazém.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Warehouse
     * @throws ApiError
     */
    public static partialUpdateWarehouse(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Warehouse,
    ): CancelablePromise<Warehouse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/warehouse/warehouse/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Armazém.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyWarehouse(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/warehouse/warehouse/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Invoice
     * @throws ApiError
     */
    public static listInvoices(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Invoice>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/billing/invoice/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Invoice
     * @throws ApiError
     */
    public static createInvoice(
        requestBody?: Invoice,
    ): CancelablePromise<Invoice> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/billing/invoice/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Retorna histórico agregado de faturamento por utilizador.
     * @returns Invoice
     * @throws ApiError
     */
    public static billingHistoryInvoice(): CancelablePromise<Invoice> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/billing/invoice/historico_faturamento/',
        });
    }
    /**
     * Emite PDF do histórico agregado de faturamento por utilizador.
     * @returns Invoice
     * @throws ApiError
     */
    public static billingHistoryPdfInvoice(): CancelablePromise<Invoice> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/billing/invoice/historico_faturamento/pdf/',
        });
    }
    /**
     * @param id A unique integer value identifying this Fatura.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Invoice
     * @throws ApiError
     */
    public static retrieveInvoice(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Invoice> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/billing/invoice/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Fatura.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Invoice
     * @throws ApiError
     */
    public static updateInvoice(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Invoice,
    ): CancelablePromise<Invoice> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/billing/invoice/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Fatura.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Invoice
     * @throws ApiError
     */
    public static partialUpdateInvoice(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Invoice,
    ): CancelablePromise<Invoice> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/billing/invoice/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Fatura.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyInvoice(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/billing/invoice/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * Gera PDF de fatura (assíncrono).
     * @param id A unique integer value identifying this Fatura.
     * @returns Invoice
     * @throws ApiError
     */
    public static pdfInvoice(
        id: string,
    ): CancelablePromise<Invoice> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/billing/invoice/{id}/pdf/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns InvoiceHistory
     * @throws ApiError
     */
    public static listInvoiceHistories(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<InvoiceHistory>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/billing/invoicehistory/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns InvoiceHistory
     * @throws ApiError
     */
    public static createInvoiceHistory(
        requestBody?: InvoiceHistory,
    ): CancelablePromise<InvoiceHistory> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/billing/invoicehistory/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Histórico de Fatura.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns InvoiceHistory
     * @throws ApiError
     */
    public static retrieveInvoiceHistory(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<InvoiceHistory> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/billing/invoicehistory/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Histórico de Fatura.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns InvoiceHistory
     * @throws ApiError
     */
    public static updateInvoiceHistory(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: InvoiceHistory,
    ): CancelablePromise<InvoiceHistory> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/billing/invoicehistory/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Histórico de Fatura.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns InvoiceHistory
     * @throws ApiError
     */
    public static partialUpdateInvoiceHistory(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: InvoiceHistory,
    ): CancelablePromise<InvoiceHistory> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/billing/invoicehistory/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Histórico de Fatura.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyInvoiceHistory(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/billing/invoicehistory/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns InvoiceItem
     * @throws ApiError
     */
    public static listInvoiceItems(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<InvoiceItem>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/billing/invoiceitem/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns InvoiceItem
     * @throws ApiError
     */
    public static createInvoiceItem(
        requestBody?: InvoiceItem,
    ): CancelablePromise<InvoiceItem> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/billing/invoiceitem/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Item de Fatura.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns InvoiceItem
     * @throws ApiError
     */
    public static retrieveInvoiceItem(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<InvoiceItem> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/billing/invoiceitem/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Item de Fatura.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns InvoiceItem
     * @throws ApiError
     */
    public static updateInvoiceItem(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: InvoiceItem,
    ): CancelablePromise<InvoiceItem> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/billing/invoiceitem/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Item de Fatura.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns InvoiceItem
     * @throws ApiError
     */
    public static partialUpdateInvoiceItem(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: InvoiceItem,
    ): CancelablePromise<InvoiceItem> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/billing/invoiceitem/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Item de Fatura.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyInvoiceItem(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/billing/invoiceitem/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns BloodDonation
     * @throws ApiError
     */
    public static listBloodDonations(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<BloodDonation>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/bloodbank/donation/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns BloodDonation
     * @throws ApiError
     */
    public static createBloodDonation(
        requestBody?: BloodDonation,
    ): CancelablePromise<BloodDonation> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/bloodbank/donation/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Doação de sangue.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns BloodDonation
     * @throws ApiError
     */
    public static retrieveBloodDonation(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<BloodDonation> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/bloodbank/donation/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Doação de sangue.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns BloodDonation
     * @throws ApiError
     */
    public static updateBloodDonation(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: BloodDonation,
    ): CancelablePromise<BloodDonation> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/bloodbank/donation/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Doação de sangue.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns BloodDonation
     * @throws ApiError
     */
    public static partialUpdateBloodDonation(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: BloodDonation,
    ): CancelablePromise<BloodDonation> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/bloodbank/donation/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Doação de sangue.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyBloodDonation(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/bloodbank/donation/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns BloodStockMovement
     * @throws ApiError
     */
    public static listBloodStockMovements(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<BloodStockMovement>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/bloodbank/stock_movement/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns BloodStockMovement
     * @throws ApiError
     */
    public static createBloodStockMovement(
        requestBody?: BloodStockMovement,
    ): CancelablePromise<BloodStockMovement> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/bloodbank/stock_movement/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Movimentação de stock de sangue.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns BloodStockMovement
     * @throws ApiError
     */
    public static retrieveBloodStockMovement(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<BloodStockMovement> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/bloodbank/stock_movement/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Movimentação de stock de sangue.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns BloodStockMovement
     * @throws ApiError
     */
    public static updateBloodStockMovement(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: BloodStockMovement,
    ): CancelablePromise<BloodStockMovement> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/bloodbank/stock_movement/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Movimentação de stock de sangue.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns BloodStockMovement
     * @throws ApiError
     */
    public static partialUpdateBloodStockMovement(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: BloodStockMovement,
    ): CancelablePromise<BloodStockMovement> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/bloodbank/stock_movement/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Movimentação de stock de sangue.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyBloodStockMovement(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/bloodbank/stock_movement/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns BloodStorage
     * @throws ApiError
     */
    public static listBloodStorages(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<BloodStorage>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/bloodbank/storage/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns BloodStorage
     * @throws ApiError
     */
    public static createBloodStorage(
        requestBody?: BloodStorage,
    ): CancelablePromise<BloodStorage> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/bloodbank/storage/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Armazenamento de sangue.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns BloodStorage
     * @throws ApiError
     */
    public static retrieveBloodStorage(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<BloodStorage> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/bloodbank/storage/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Armazenamento de sangue.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns BloodStorage
     * @throws ApiError
     */
    public static updateBloodStorage(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: BloodStorage,
    ): CancelablePromise<BloodStorage> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/bloodbank/storage/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Armazenamento de sangue.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns BloodStorage
     * @throws ApiError
     */
    public static partialUpdateBloodStorage(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: BloodStorage,
    ): CancelablePromise<BloodStorage> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/bloodbank/storage/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Armazenamento de sangue.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyBloodStorage(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/bloodbank/storage/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns BloodStorageMaintenance
     * @throws ApiError
     */
    public static listBloodStorageMaintenances(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<BloodStorageMaintenance>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/bloodbank/storage_maintenance/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns BloodStorageMaintenance
     * @throws ApiError
     */
    public static createBloodStorageMaintenance(
        requestBody?: BloodStorageMaintenance,
    ): CancelablePromise<BloodStorageMaintenance> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/bloodbank/storage_maintenance/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Manutenção de banco de sangue.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns BloodStorageMaintenance
     * @throws ApiError
     */
    public static retrieveBloodStorageMaintenance(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<BloodStorageMaintenance> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/bloodbank/storage_maintenance/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Manutenção de banco de sangue.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns BloodStorageMaintenance
     * @throws ApiError
     */
    public static updateBloodStorageMaintenance(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: BloodStorageMaintenance,
    ): CancelablePromise<BloodStorageMaintenance> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/bloodbank/storage_maintenance/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Manutenção de banco de sangue.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns BloodStorageMaintenance
     * @throws ApiError
     */
    public static partialUpdateBloodStorageMaintenance(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: BloodStorageMaintenance,
    ): CancelablePromise<BloodStorageMaintenance> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/bloodbank/storage_maintenance/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Manutenção de banco de sangue.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyBloodStorageMaintenance(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/bloodbank/storage_maintenance/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns BloodTransfusion
     * @throws ApiError
     */
    public static listBloodTransfusions(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<BloodTransfusion>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/bloodbank/transfusion/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns BloodTransfusion
     * @throws ApiError
     */
    public static createBloodTransfusion(
        requestBody?: BloodTransfusion,
    ): CancelablePromise<BloodTransfusion> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/bloodbank/transfusion/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Transfusão de sangue.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns BloodTransfusion
     * @throws ApiError
     */
    public static retrieveBloodTransfusion(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<BloodTransfusion> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/bloodbank/transfusion/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Transfusão de sangue.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns BloodTransfusion
     * @throws ApiError
     */
    public static updateBloodTransfusion(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: BloodTransfusion,
    ): CancelablePromise<BloodTransfusion> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/bloodbank/transfusion/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Transfusão de sangue.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns BloodTransfusion
     * @throws ApiError
     */
    public static partialUpdateBloodTransfusion(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: BloodTransfusion,
    ): CancelablePromise<BloodTransfusion> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/bloodbank/transfusion/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Transfusão de sangue.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyBloodTransfusion(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/bloodbank/transfusion/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns BloodUnit
     * @throws ApiError
     */
    public static listBloodUnits(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<BloodUnit>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/bloodbank/unit/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns BloodUnit
     * @throws ApiError
     */
    public static createBloodUnit(
        requestBody?: BloodUnit,
    ): CancelablePromise<BloodUnit> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/bloodbank/unit/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Unidade de sangue.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns BloodUnit
     * @throws ApiError
     */
    public static retrieveBloodUnit(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<BloodUnit> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/bloodbank/unit/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Unidade de sangue.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns BloodUnit
     * @throws ApiError
     */
    public static updateBloodUnit(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: BloodUnit,
    ): CancelablePromise<BloodUnit> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/bloodbank/unit/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Unidade de sangue.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns BloodUnit
     * @throws ApiError
     */
    public static partialUpdateBloodUnit(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: BloodUnit,
    ): CancelablePromise<BloodUnit> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/bloodbank/unit/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Unidade de sangue.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyBloodUnit(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/bloodbank/unit/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns PasswordResetToken
     * @throws ApiError
     */
    public static listPasswordResetTokens(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<PasswordResetToken>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/identity/passwordresettoken/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns PasswordResetToken
     * @throws ApiError
     */
    public static createPasswordResetToken(
        requestBody?: PasswordResetToken,
    ): CancelablePromise<PasswordResetToken> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/identity/passwordresettoken/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Token de Reset de Password.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns PasswordResetToken
     * @throws ApiError
     */
    public static retrievePasswordResetToken(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<PasswordResetToken> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/identity/passwordresettoken/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Token de Reset de Password.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns PasswordResetToken
     * @throws ApiError
     */
    public static updatePasswordResetToken(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: PasswordResetToken,
    ): CancelablePromise<PasswordResetToken> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/identity/passwordresettoken/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Token de Reset de Password.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns PasswordResetToken
     * @throws ApiError
     */
    public static partialUpdatePasswordResetToken(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: PasswordResetToken,
    ): CancelablePromise<PasswordResetToken> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/identity/passwordresettoken/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Token de Reset de Password.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyPasswordResetToken(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/identity/passwordresettoken/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ProfessionalProfile
     * @throws ApiError
     */
    public static listProfessionalProfiles(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<ProfessionalProfile>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/identity/perfilprofissional/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns ProfessionalProfile
     * @throws ApiError
     */
    public static createProfessionalProfile(
        requestBody?: ProfessionalProfile,
    ): CancelablePromise<ProfessionalProfile> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/identity/perfilprofissional/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Perfil Profissional.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ProfessionalProfile
     * @throws ApiError
     */
    public static retrieveProfessionalProfile(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<ProfessionalProfile> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/identity/perfilprofissional/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Perfil Profissional.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ProfessionalProfile
     * @throws ApiError
     */
    public static updateProfessionalProfile(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ProfessionalProfile,
    ): CancelablePromise<ProfessionalProfile> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/identity/perfilprofissional/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Perfil Profissional.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ProfessionalProfile
     * @throws ApiError
     */
    public static partialUpdateProfessionalProfile(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ProfessionalProfile,
    ): CancelablePromise<ProfessionalProfile> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/identity/perfilprofissional/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Perfil Profissional.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyProfessionalProfile(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/identity/perfilprofissional/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns User
     * @throws ApiError
     */
    public static listUsers2(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<User>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/identity/user/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns User
     * @throws ApiError
     */
    public static createUser(
        requestBody?: User,
    ): CancelablePromise<User> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/identity/user/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Usuário.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns User
     * @throws ApiError
     */
    public static retrieveUser1(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<User> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/identity/user/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Usuário.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns User
     * @throws ApiError
     */
    public static updateUser(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: User,
    ): CancelablePromise<User> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/identity/user/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Usuário.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns User
     * @throws ApiError
     */
    public static partialUpdateUser1(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: User,
    ): CancelablePromise<User> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/identity/user/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Não remove usuário: converte DELETE em desativação de conta.
     * @param id A unique integer value identifying this Usuário.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyUser(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/identity/user/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns TenantConfiguration
     * @throws ApiError
     */
    public static listTenantConfigurations(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<TenantConfiguration>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/tenants/configuracaoinquilino/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns TenantConfiguration
     * @throws ApiError
     */
    public static createTenantConfiguration(
        requestBody?: TenantConfiguration,
    ): CancelablePromise<TenantConfiguration> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/tenants/configuracaoinquilino/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Configuração do Inquilino.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns TenantConfiguration
     * @throws ApiError
     */
    public static retrieveTenantConfiguration(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<TenantConfiguration> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/tenants/configuracaoinquilino/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Configuração do Inquilino.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns TenantConfiguration
     * @throws ApiError
     */
    public static updateTenantConfiguration(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: TenantConfiguration,
    ): CancelablePromise<TenantConfiguration> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/tenants/configuracaoinquilino/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Configuração do Inquilino.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns TenantConfiguration
     * @throws ApiError
     */
    public static partialUpdateTenantConfiguration(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: TenantConfiguration,
    ): CancelablePromise<TenantConfiguration> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/tenants/configuracaoinquilino/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Configuração do Inquilino.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyTenantConfiguration(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/tenants/configuracaoinquilino/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns FeatureFlagTenant
     * @throws ApiError
     */
    public static listTenantFeatureFlags(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<FeatureFlagTenant>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/tenants/featureflagtenant/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns FeatureFlagTenant
     * @throws ApiError
     */
    public static createTenantFeatureFlag(
        requestBody?: FeatureFlagTenant,
    ): CancelablePromise<FeatureFlagTenant> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/tenants/featureflagtenant/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Feature Flag (Tenant).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns FeatureFlagTenant
     * @throws ApiError
     */
    public static retrieveTenantFeatureFlag(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<FeatureFlagTenant> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/tenants/featureflagtenant/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Feature Flag (Tenant).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns FeatureFlagTenant
     * @throws ApiError
     */
    public static updateTenantFeatureFlag(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: FeatureFlagTenant,
    ): CancelablePromise<FeatureFlagTenant> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/tenants/featureflagtenant/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Feature Flag (Tenant).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns FeatureFlagTenant
     * @throws ApiError
     */
    public static partialUpdateTenantFeatureFlag(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: FeatureFlagTenant,
    ): CancelablePromise<FeatureFlagTenant> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/tenants/featureflagtenant/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Feature Flag (Tenant).
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyTenantFeatureFlag(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/tenants/featureflagtenant/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns SubscriptionPlan
     * @throws ApiError
     */
    public static listSubscriptionPlans(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<SubscriptionPlan>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/tenants/planoassinatura/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns SubscriptionPlan
     * @throws ApiError
     */
    public static createSubscriptionPlan(
        requestBody?: SubscriptionPlan,
    ): CancelablePromise<SubscriptionPlan> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/tenants/planoassinatura/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Plano de Assinatura.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns SubscriptionPlan
     * @throws ApiError
     */
    public static retrieveSubscriptionPlan(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<SubscriptionPlan> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/tenants/planoassinatura/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Plano de Assinatura.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns SubscriptionPlan
     * @throws ApiError
     */
    public static updateSubscriptionPlan(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: SubscriptionPlan,
    ): CancelablePromise<SubscriptionPlan> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/tenants/planoassinatura/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Plano de Assinatura.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns SubscriptionPlan
     * @throws ApiError
     */
    public static partialUpdateSubscriptionPlan(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: SubscriptionPlan,
    ): CancelablePromise<SubscriptionPlan> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/tenants/planoassinatura/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Plano de Assinatura.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroySubscriptionPlan(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/tenants/planoassinatura/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Tenant
     * @throws ApiError
     */
    public static listTenants(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Tenant>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/tenants/tenant/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Tenant
     * @throws ApiError
     */
    public static createTenant(
        requestBody?: Tenant,
    ): CancelablePromise<Tenant> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/tenants/tenant/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Inquilino.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Tenant
     * @throws ApiError
     */
    public static retrieveTenant(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Tenant> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/tenants/tenant/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Inquilino.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Tenant
     * @throws ApiError
     */
    public static updateTenant(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Tenant,
    ): CancelablePromise<Tenant> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/tenants/tenant/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Inquilino.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Tenant
     * @throws ApiError
     */
    public static partialUpdateTenant(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Tenant,
    ): CancelablePromise<Tenant> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/tenants/tenant/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Inquilino.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyTenant(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/tenants/tenant/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns TenantUsage
     * @throws ApiError
     */
    public static listTenantUsages(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<TenantUsage>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/tenants/usotenant/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns TenantUsage
     * @throws ApiError
     */
    public static createTenantUsage(
        requestBody?: TenantUsage,
    ): CancelablePromise<TenantUsage> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/tenants/usotenant/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Uso do Tenant.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns TenantUsage
     * @throws ApiError
     */
    public static retrieveTenantUsage(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<TenantUsage> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/tenants/usotenant/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Uso do Tenant.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns TenantUsage
     * @throws ApiError
     */
    public static updateTenantUsage(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: TenantUsage,
    ): CancelablePromise<TenantUsage> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/tenants/usotenant/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Uso do Tenant.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns TenantUsage
     * @throws ApiError
     */
    public static partialUpdateTenantUsage(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: TenantUsage,
    ): CancelablePromise<TenantUsage> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/tenants/usotenant/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Uso do Tenant.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyTenantUsage(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/tenants/usotenant/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns DeliveryLog
     * @throws ApiError
     */
    public static listDeliveryLogs(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<DeliveryLog>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/notifications/logenvio/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns DeliveryLog
     * @throws ApiError
     */
    public static createDeliveryLog(
        requestBody?: DeliveryLog,
    ): CancelablePromise<DeliveryLog> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/notifications/logenvio/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Log de Envio.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns DeliveryLog
     * @throws ApiError
     */
    public static retrieveDeliveryLog(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<DeliveryLog> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/notifications/logenvio/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Log de Envio.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns DeliveryLog
     * @throws ApiError
     */
    public static updateDeliveryLog(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: DeliveryLog,
    ): CancelablePromise<DeliveryLog> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/notifications/logenvio/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Log de Envio.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns DeliveryLog
     * @throws ApiError
     */
    public static partialUpdateDeliveryLog(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: DeliveryLog,
    ): CancelablePromise<DeliveryLog> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/notifications/logenvio/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Log de Envio.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyDeliveryLog(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/notifications/logenvio/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Notification
     * @throws ApiError
     */
    public static listNotifications(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Notification>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/notifications/notification/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Notification
     * @throws ApiError
     */
    public static createNotification(
        requestBody?: Notification,
    ): CancelablePromise<Notification> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/notifications/notification/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Notificação.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Notification
     * @throws ApiError
     */
    public static retrieveNotification(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Notification> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/notifications/notification/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Notificação.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Notification
     * @throws ApiError
     */
    public static updateNotification(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Notification,
    ): CancelablePromise<Notification> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/notifications/notification/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Notificação.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Notification
     * @throws ApiError
     */
    public static partialUpdateNotification(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Notification,
    ): CancelablePromise<Notification> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/notifications/notification/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Notificação.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyNotification(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/notifications/notification/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns NotificationTemplate
     * @throws ApiError
     */
    public static listNotificationTemplates(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<NotificationTemplate>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/notifications/template/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns NotificationTemplate
     * @throws ApiError
     */
    public static createNotificationTemplate(
        requestBody?: NotificationTemplate,
    ): CancelablePromise<NotificationTemplate> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/notifications/template/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Template de Notificação.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns NotificationTemplate
     * @throws ApiError
     */
    public static retrieveNotificationTemplate(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<NotificationTemplate> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/notifications/template/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Template de Notificação.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns NotificationTemplate
     * @throws ApiError
     */
    public static updateNotificationTemplate(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: NotificationTemplate,
    ): CancelablePromise<NotificationTemplate> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/notifications/template/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Template de Notificação.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns NotificationTemplate
     * @throws ApiError
     */
    public static partialUpdateNotificationTemplate(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: NotificationTemplate,
    ): CancelablePromise<NotificationTemplate> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/notifications/template/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Template de Notificação.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyNotificationTemplate(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/notifications/template/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Payment
     * @throws ApiError
     */
    public static listPayments(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Payment>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/payments/payment/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Payment
     * @throws ApiError
     */
    public static createPayment(
        requestBody?: Payment,
    ): CancelablePromise<Payment> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/payments/payment/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Pagamento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Payment
     * @throws ApiError
     */
    public static retrievePayment(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Payment> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/payments/payment/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Pagamento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Payment
     * @throws ApiError
     */
    public static updatePayment(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Payment,
    ): CancelablePromise<Payment> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/payments/payment/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Pagamento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Payment
     * @throws ApiError
     */
    public static partialUpdatePayment(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Payment,
    ): CancelablePromise<Payment> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/payments/payment/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Pagamento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyPayment(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/payments/payment/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Receipt
     * @throws ApiError
     */
    public static listReceipts(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Receipt>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/payments/receipt/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Receipt
     * @throws ApiError
     */
    public static createReceipt(
        requestBody?: Receipt,
    ): CancelablePromise<Receipt> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/payments/receipt/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Recibo.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Receipt
     * @throws ApiError
     */
    public static retrieveReceipt(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Receipt> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/payments/receipt/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Recibo.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Receipt
     * @throws ApiError
     */
    public static updateReceipt(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Receipt,
    ): CancelablePromise<Receipt> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/payments/receipt/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Recibo.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Receipt
     * @throws ApiError
     */
    public static partialUpdateReceipt(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Receipt,
    ): CancelablePromise<Receipt> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/payments/receipt/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Recibo.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyReceipt(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/payments/receipt/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Recibo.
     * @returns Receipt
     * @throws ApiError
     */
    public static pdfReceipt(
        id: string,
    ): CancelablePromise<Receipt> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/payments/receipt/{id}/pdf/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Reconciliation
     * @throws ApiError
     */
    public static listReconciliations(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Reconciliation>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/payments/reconciliation/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Reconciliation
     * @throws ApiError
     */
    public static createReconciliation(
        requestBody?: Reconciliation,
    ): CancelablePromise<Reconciliation> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/payments/reconciliation/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Reconciliação.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Reconciliation
     * @throws ApiError
     */
    public static retrieveReconciliation(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Reconciliation> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/payments/reconciliation/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Reconciliação.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Reconciliation
     * @throws ApiError
     */
    public static updateReconciliation(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Reconciliation,
    ): CancelablePromise<Reconciliation> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/payments/reconciliation/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Reconciliação.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Reconciliation
     * @throws ApiError
     */
    public static partialUpdateReconciliation(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Reconciliation,
    ): CancelablePromise<Reconciliation> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/payments/reconciliation/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Reconciliação.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyReconciliation(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/payments/reconciliation/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Transaction
     * @throws ApiError
     */
    public static listTransactions(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Transaction>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/payments/transaction/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Transaction
     * @throws ApiError
     */
    public static createTransaction(
        requestBody?: Transaction,
    ): CancelablePromise<Transaction> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/payments/transaction/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Transação.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Transaction
     * @throws ApiError
     */
    public static retrieveTransaction(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Transaction> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/payments/transaction/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Transação.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Transaction
     * @throws ApiError
     */
    public static updateTransaction(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Transaction,
    ): CancelablePromise<Transaction> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/payments/transaction/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Transação.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Transaction
     * @throws ApiError
     */
    public static partialUpdateTransaction(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Transaction,
    ): CancelablePromise<Transaction> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/payments/transaction/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Transação.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyTransaction(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/payments/transaction/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * Ações avulsas do fluxo de cuidado (pagar, criar requisição/fatura).
     * @param id
     * @returns any
     * @throws ApiError
     */
    public static retrieveReceptionCareViewSet(
        id: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/reception/atendimento/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * CRUD de check-ins, com ações para request, invoice e pagamento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ReceptionCheckin
     * @throws ApiError
     */
    public static listReceptionCheckins(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<ReceptionCheckin>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/reception/checkin/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * CRUD de check-ins, com ações para request, invoice e pagamento.
     * @param requestBody
     * @returns ReceptionCheckin
     * @throws ApiError
     */
    public static createReceptionCheckin(
        requestBody?: ReceptionCheckin,
    ): CancelablePromise<ReceptionCheckin> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/reception/checkin/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * CRUD de check-ins, com ações para request, invoice e pagamento.
     * @param id A unique integer value identifying this Check-in.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ReceptionCheckin
     * @throws ApiError
     */
    public static retrieveReceptionCheckin(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<ReceptionCheckin> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/reception/checkin/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * CRUD de check-ins, com ações para request, invoice e pagamento.
     * @param id A unique integer value identifying this Check-in.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ReceptionCheckin
     * @throws ApiError
     */
    public static updateReceptionCheckin(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ReceptionCheckin,
    ): CancelablePromise<ReceptionCheckin> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/reception/checkin/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * CRUD de check-ins, com ações para request, invoice e pagamento.
     * @param id A unique integer value identifying this Check-in.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ReceptionCheckin
     * @throws ApiError
     */
    public static partialUpdateReceptionCheckin(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ReceptionCheckin,
    ): CancelablePromise<ReceptionCheckin> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/reception/checkin/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * CRUD de check-ins, com ações para request, invoice e pagamento.
     * @param id A unique integer value identifying this Check-in.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyReceptionCheckin(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/reception/checkin/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * CRUD de check-ins, com ações para request, invoice e pagamento.
     * @param id A unique integer value identifying this Check-in.
     * @returns ReceptionCheckin
     * @throws ApiError
     */
    public static careReceptionCheckin(
        id: string,
    ): CancelablePromise<ReceptionCheckin> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/reception/checkin/{id}/atendimento/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Retorna datas/intervalos de trabalho da recepção (read-only).
     * @returns any
     * @throws ApiError
     */
    public static listReceptionWorkspaceViewSets(): CancelablePromise<Array<any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/reception/workspace/',
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns CoveragePlan
     * @throws ApiError
     */
    public static listCoveragePlans(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<CoveragePlan>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/insurer/coverage_plan/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns CoveragePlan
     * @throws ApiError
     */
    public static createCoveragePlan(
        requestBody?: CoveragePlan,
    ): CancelablePromise<CoveragePlan> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/insurer/coverage_plan/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Plano de Cobertura.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns CoveragePlan
     * @throws ApiError
     */
    public static retrieveCoveragePlan(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<CoveragePlan> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/insurer/coverage_plan/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Plano de Cobertura.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns CoveragePlan
     * @throws ApiError
     */
    public static updateCoveragePlan(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: CoveragePlan,
    ): CancelablePromise<CoveragePlan> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/insurer/coverage_plan/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Plano de Cobertura.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns CoveragePlan
     * @throws ApiError
     */
    public static partialUpdateCoveragePlan(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: CoveragePlan,
    ): CancelablePromise<CoveragePlan> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/insurer/coverage_plan/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Plano de Cobertura.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyCoveragePlan(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/insurer/coverage_plan/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Insurer
     * @throws ApiError
     */
    public static listInsurers(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Insurer>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/insurer/insurer/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Insurer
     * @throws ApiError
     */
    public static createInsurer(
        requestBody?: Insurer,
    ): CancelablePromise<Insurer> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/insurer/insurer/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Seguradora.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Insurer
     * @throws ApiError
     */
    public static retrieveInsurer(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Insurer> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/insurer/insurer/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Seguradora.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Insurer
     * @throws ApiError
     */
    public static updateInsurer(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Insurer,
    ): CancelablePromise<Insurer> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/insurer/insurer/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Seguradora.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Insurer
     * @throws ApiError
     */
    public static partialUpdateInsurer(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Insurer,
    ): CancelablePromise<Insurer> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/insurer/insurer/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Seguradora.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyInsurer(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/insurer/insurer/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ProcedureAuthorization
     * @throws ApiError
     */
    public static listProcedureAuthorizations(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<ProcedureAuthorization>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/insurer/procedure_authorization/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns ProcedureAuthorization
     * @throws ApiError
     */
    public static createProcedureAuthorization(
        requestBody?: ProcedureAuthorization,
    ): CancelablePromise<ProcedureAuthorization> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/insurer/procedure_authorization/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Autorização de Procedimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ProcedureAuthorization
     * @throws ApiError
     */
    public static retrieveProcedureAuthorization(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<ProcedureAuthorization> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/insurer/procedure_authorization/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Autorização de Procedimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ProcedureAuthorization
     * @throws ApiError
     */
    public static updateProcedureAuthorization(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ProcedureAuthorization,
    ): CancelablePromise<ProcedureAuthorization> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/insurer/procedure_authorization/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Autorização de Procedimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ProcedureAuthorization
     * @throws ApiError
     */
    public static partialUpdateProcedureAuthorization(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ProcedureAuthorization,
    ): CancelablePromise<ProcedureAuthorization> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/insurer/procedure_authorization/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Autorização de Procedimento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyProcedureAuthorization(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/insurer/procedure_authorization/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns TenantCoveragePlan
     * @throws ApiError
     */
    public static listTenantCoveragePlans(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<TenantCoveragePlan>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/insurer/tenant_coverage_plan/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns TenantCoveragePlan
     * @throws ApiError
     */
    public static createTenantCoveragePlan(
        requestBody?: TenantCoveragePlan,
    ): CancelablePromise<TenantCoveragePlan> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/insurer/tenant_coverage_plan/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Plano por Tenant.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns TenantCoveragePlan
     * @throws ApiError
     */
    public static retrieveTenantCoveragePlan(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<TenantCoveragePlan> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/insurer/tenant_coverage_plan/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Plano por Tenant.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns TenantCoveragePlan
     * @throws ApiError
     */
    public static updateTenantCoveragePlan(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: TenantCoveragePlan,
    ): CancelablePromise<TenantCoveragePlan> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/insurer/tenant_coverage_plan/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Plano por Tenant.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns TenantCoveragePlan
     * @throws ApiError
     */
    public static partialUpdateTenantCoveragePlan(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: TenantCoveragePlan,
    ): CancelablePromise<TenantCoveragePlan> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/insurer/tenant_coverage_plan/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Plano por Tenant.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyTenantCoveragePlan(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/insurer/tenant_coverage_plan/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Maintenance
     * @throws ApiError
     */
    public static listMaintenances(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Maintenance>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/maintenance/maintenance/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Maintenance
     * @throws ApiError
     */
    public static createMaintenance(
        requestBody?: Maintenance,
    ): CancelablePromise<Maintenance> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/maintenance/maintenance/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns Maintenance
     * @throws ApiError
     */
    public static pendingRequestsMaintenance(): CancelablePromise<Maintenance> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/maintenance/maintenance/pending-requests/',
        });
    }
    /**
     * @param id A unique integer value identifying this Manutenção.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Maintenance
     * @throws ApiError
     */
    public static retrieveMaintenance(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Maintenance> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/maintenance/maintenance/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Manutenção.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Maintenance
     * @throws ApiError
     */
    public static updateMaintenance(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Maintenance,
    ): CancelablePromise<Maintenance> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/maintenance/maintenance/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Manutenção.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Maintenance
     * @throws ApiError
     */
    public static partialUpdateMaintenance(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Maintenance,
    ): CancelablePromise<Maintenance> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/maintenance/maintenance/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Manutenção.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyMaintenance(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/maintenance/maintenance/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns PrescriptionItem
     * @throws ApiError
     */
    public static listPrescriptionItems(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<PrescriptionItem>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/medical_records/prescricaoitem/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns PrescriptionItem
     * @throws ApiError
     */
    public static createPrescriptionItem(
        requestBody?: PrescriptionItem,
    ): CancelablePromise<PrescriptionItem> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/medical_records/prescricaoitem/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Item de Prescrição.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns PrescriptionItem
     * @throws ApiError
     */
    public static retrievePrescriptionItem(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<PrescriptionItem> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/medical_records/prescricaoitem/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Item de Prescrição.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns PrescriptionItem
     * @throws ApiError
     */
    public static updatePrescriptionItem(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: PrescriptionItem,
    ): CancelablePromise<PrescriptionItem> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/medical_records/prescricaoitem/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Item de Prescrição.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns PrescriptionItem
     * @throws ApiError
     */
    public static partialUpdatePrescriptionItem(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: PrescriptionItem,
    ): CancelablePromise<PrescriptionItem> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/medical_records/prescricaoitem/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Item de Prescrição.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyPrescriptionItem(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/medical_records/prescricaoitem/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns MedicalRecordEntry
     * @throws ApiError
     */
    public static listMedicalRecordEntries(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<MedicalRecordEntry>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/medical_records/record/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns MedicalRecordEntry
     * @throws ApiError
     */
    public static createMedicalRecordEntry(
        requestBody?: MedicalRecordEntry,
    ): CancelablePromise<MedicalRecordEntry> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/medical_records/record/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Cardex.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns MedicalRecordEntry
     * @throws ApiError
     */
    public static retrieveMedicalRecordEntry(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<MedicalRecordEntry> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/medical_records/record/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Cardex.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns MedicalRecordEntry
     * @throws ApiError
     */
    public static updateMedicalRecordEntry(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: MedicalRecordEntry,
    ): CancelablePromise<MedicalRecordEntry> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/medical_records/record/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Cardex.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns MedicalRecordEntry
     * @throws ApiError
     */
    public static partialUpdateMedicalRecordEntry(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: MedicalRecordEntry,
    ): CancelablePromise<MedicalRecordEntry> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/medical_records/record/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Cardex.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyMedicalRecordEntry(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/medical_records/record/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Pregnancy
     * @throws ApiError
     */
    public static listPregnancies(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Pregnancy>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/maternity/gestacao/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Pregnancy
     * @throws ApiError
     */
    public static createPregnancy(
        requestBody?: Pregnancy,
    ): CancelablePromise<Pregnancy> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/maternity/gestacao/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Gestação.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Pregnancy
     * @throws ApiError
     */
    public static retrievePregnancy(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Pregnancy> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/maternity/gestacao/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Gestação.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Pregnancy
     * @throws ApiError
     */
    public static updatePregnancy(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Pregnancy,
    ): CancelablePromise<Pregnancy> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/maternity/gestacao/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Gestação.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Pregnancy
     * @throws ApiError
     */
    public static partialUpdatePregnancy(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Pregnancy,
    ): CancelablePromise<Pregnancy> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/maternity/gestacao/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Gestação.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyPregnancy(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/maternity/gestacao/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns LargeSurgery
     * @throws ApiError
     */
    public static listLargeSurgeries(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<LargeSurgery>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/surgery/large_surgery/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns LargeSurgery
     * @throws ApiError
     */
    public static createLargeSurgery(
        requestBody?: LargeSurgery,
    ): CancelablePromise<LargeSurgery> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/surgery/large_surgery/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Grande cirurgia.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns LargeSurgery
     * @throws ApiError
     */
    public static retrieveLargeSurgery(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<LargeSurgery> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/surgery/large_surgery/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Grande cirurgia.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns LargeSurgery
     * @throws ApiError
     */
    public static updateLargeSurgery(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: LargeSurgery,
    ): CancelablePromise<LargeSurgery> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/surgery/large_surgery/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Grande cirurgia.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns LargeSurgery
     * @throws ApiError
     */
    public static partialUpdateLargeSurgery(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: LargeSurgery,
    ): CancelablePromise<LargeSurgery> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/surgery/large_surgery/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Grande cirurgia.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyLargeSurgery(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/surgery/large_surgery/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns SmallSurgery
     * @throws ApiError
     */
    public static listSmallSurgeries(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<SmallSurgery>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/surgery/small_surgery/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns SmallSurgery
     * @throws ApiError
     */
    public static createSmallSurgery(
        requestBody?: SmallSurgery,
    ): CancelablePromise<SmallSurgery> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/surgery/small_surgery/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Pequena cirurgia.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns SmallSurgery
     * @throws ApiError
     */
    public static retrieveSmallSurgery(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<SmallSurgery> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/surgery/small_surgery/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Pequena cirurgia.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns SmallSurgery
     * @throws ApiError
     */
    public static updateSmallSurgery(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: SmallSurgery,
    ): CancelablePromise<SmallSurgery> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/surgery/small_surgery/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Pequena cirurgia.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns SmallSurgery
     * @throws ApiError
     */
    public static partialUpdateSmallSurgery(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: SmallSurgery,
    ): CancelablePromise<SmallSurgery> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/surgery/small_surgery/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Pequena cirurgia.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroySmallSurgery(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/surgery/small_surgery/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Surgery
     * @throws ApiError
     */
    public static listSurgeries(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Surgery>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/surgery/surgery/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Surgery
     * @throws ApiError
     */
    public static createSurgery(
        requestBody?: Surgery,
    ): CancelablePromise<Surgery> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/surgery/surgery/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Cirurgia.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Surgery
     * @throws ApiError
     */
    public static retrieveSurgery(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Surgery> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/surgery/surgery/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Cirurgia.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Surgery
     * @throws ApiError
     */
    public static updateSurgery(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Surgery,
    ): CancelablePromise<Surgery> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/surgery/surgery/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Cirurgia.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Surgery
     * @throws ApiError
     */
    public static partialUpdateSurgery(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Surgery,
    ): CancelablePromise<Surgery> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/surgery/surgery/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Cirurgia.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroySurgery(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/surgery/surgery/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns SurgicalProcedure
     * @throws ApiError
     */
    public static listSurgicalProcedures(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<SurgicalProcedure>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/surgery/surgical_procedure/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns SurgicalProcedure
     * @throws ApiError
     */
    public static createSurgicalProcedure(
        requestBody?: SurgicalProcedure,
    ): CancelablePromise<SurgicalProcedure> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/surgery/surgical_procedure/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Procedimento Cirúrgico.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns SurgicalProcedure
     * @throws ApiError
     */
    public static retrieveSurgicalProcedure(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<SurgicalProcedure> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/surgery/surgical_procedure/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Procedimento Cirúrgico.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns SurgicalProcedure
     * @throws ApiError
     */
    public static updateSurgicalProcedure(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: SurgicalProcedure,
    ): CancelablePromise<SurgicalProcedure> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/surgery/surgical_procedure/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Procedimento Cirúrgico.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns SurgicalProcedure
     * @throws ApiError
     */
    public static partialUpdateSurgicalProcedure(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: SurgicalProcedure,
    ): CancelablePromise<SurgicalProcedure> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/surgery/surgical_procedure/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Procedimento Cirúrgico.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroySurgicalProcedure(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/surgery/surgical_procedure/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns FamilyDependent
     * @throws ApiError
     */
    public static listFamilyDependents(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<FamilyDependent>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/human_resources/agregadofamiliar/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns FamilyDependent
     * @throws ApiError
     */
    public static createFamilyDependent(
        requestBody?: FamilyDependent,
    ): CancelablePromise<FamilyDependent> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/human_resources/agregadofamiliar/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Agregado Familiar.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns FamilyDependent
     * @throws ApiError
     */
    public static retrieveFamilyDependent(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<FamilyDependent> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/human_resources/agregadofamiliar/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Agregado Familiar.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns FamilyDependent
     * @throws ApiError
     */
    public static updateFamilyDependent(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: FamilyDependent,
    ): CancelablePromise<FamilyDependent> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/human_resources/agregadofamiliar/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Agregado Familiar.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns FamilyDependent
     * @throws ApiError
     */
    public static partialUpdateFamilyDependent(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: FamilyDependent,
    ): CancelablePromise<FamilyDependent> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/human_resources/agregadofamiliar/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Agregado Familiar.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyFamilyDependent(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/human_resources/agregadofamiliar/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Termination
     * @throws ApiError
     */
    public static listTerminations(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Termination>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/human_resources/dispensa/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Termination
     * @throws ApiError
     */
    public static createTermination(
        requestBody?: Termination,
    ): CancelablePromise<Termination> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/human_resources/dispensa/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Dispensa.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Termination
     * @throws ApiError
     */
    public static retrieveTermination(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Termination> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/human_resources/dispensa/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Dispensa.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Termination
     * @throws ApiError
     */
    public static updateTermination(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Termination,
    ): CancelablePromise<Termination> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/human_resources/dispensa/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Dispensa.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Termination
     * @throws ApiError
     */
    public static partialUpdateTermination(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Termination,
    ): CancelablePromise<Termination> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/human_resources/dispensa/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Dispensa.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyTermination(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/human_resources/dispensa/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Employee
     * @throws ApiError
     */
    public static listEmployees1(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Employee>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/human_resources/employee/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Employee
     * @throws ApiError
     */
    public static createEmployee(
        requestBody?: Employee,
    ): CancelablePromise<Employee> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/human_resources/employee/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Funcionário.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Employee
     * @throws ApiError
     */
    public static retrieveEmployee1(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Employee> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/human_resources/employee/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Funcionário.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Employee
     * @throws ApiError
     */
    public static updateEmployee(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Employee,
    ): CancelablePromise<Employee> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/human_resources/employee/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Funcionário.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Employee
     * @throws ApiError
     */
    public static partialUpdateEmployee(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Employee,
    ): CancelablePromise<Employee> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/human_resources/employee/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Não remove funcionário: converte DELETE em inativação.
     * @param id A unique integer value identifying this Funcionário.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyEmployee(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/human_resources/employee/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Absence
     * @throws ApiError
     */
    public static listAbsences(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Absence>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/human_resources/falta/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Absence
     * @throws ApiError
     */
    public static createAbsence(
        requestBody?: Absence,
    ): CancelablePromise<Absence> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/human_resources/falta/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Falta.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Absence
     * @throws ApiError
     */
    public static retrieveAbsence(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Absence> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/human_resources/falta/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Falta.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Absence
     * @throws ApiError
     */
    public static updateAbsence(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Absence,
    ): CancelablePromise<Absence> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/human_resources/falta/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Falta.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Absence
     * @throws ApiError
     */
    public static partialUpdateAbsence(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Absence,
    ): CancelablePromise<Absence> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/human_resources/falta/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Falta.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyAbsence(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/human_resources/falta/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Vacation
     * @throws ApiError
     */
    public static listVacations(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Vacation>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/human_resources/ferias/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Vacation
     * @throws ApiError
     */
    public static createVacation(
        requestBody?: Vacation,
    ): CancelablePromise<Vacation> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/human_resources/ferias/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Férias.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Vacation
     * @throws ApiError
     */
    public static retrieveVacation(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Vacation> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/human_resources/ferias/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Férias.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Vacation
     * @throws ApiError
     */
    public static updateVacation(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Vacation,
    ): CancelablePromise<Vacation> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/human_resources/ferias/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Férias.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Vacation
     * @throws ApiError
     */
    public static partialUpdateVacation(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Vacation,
    ): CancelablePromise<Vacation> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/human_resources/ferias/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Férias.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyVacation(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/human_resources/ferias/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Payroll
     * @throws ApiError
     */
    public static listPayrolls(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Payroll>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/human_resources/folhapagamento/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Payroll
     * @throws ApiError
     */
    public static createPayroll(
        requestBody?: Payroll,
    ): CancelablePromise<Payroll> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/human_resources/folhapagamento/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Folha de Pagamento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Payroll
     * @throws ApiError
     */
    public static retrievePayroll(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Payroll> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/human_resources/folhapagamento/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Folha de Pagamento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Payroll
     * @throws ApiError
     */
    public static updatePayroll(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Payroll,
    ): CancelablePromise<Payroll> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/human_resources/folhapagamento/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Folha de Pagamento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Payroll
     * @throws ApiError
     */
    public static partialUpdatePayroll(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Payroll,
    ): CancelablePromise<Payroll> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/human_resources/folhapagamento/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Folha de Pagamento.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyPayroll(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/human_resources/folhapagamento/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Overtime
     * @throws ApiError
     */
    public static listOvertimes(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Overtime>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/human_resources/horaextra/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Overtime
     * @throws ApiError
     */
    public static createOvertime(
        requestBody?: Overtime,
    ): CancelablePromise<Overtime> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/human_resources/horaextra/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Hora Extra.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Overtime
     * @throws ApiError
     */
    public static retrieveOvertime(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Overtime> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/human_resources/horaextra/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Hora Extra.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Overtime
     * @throws ApiError
     */
    public static updateOvertime(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Overtime,
    ): CancelablePromise<Overtime> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/human_resources/horaextra/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Hora Extra.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Overtime
     * @throws ApiError
     */
    public static partialUpdateOvertime(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Overtime,
    ): CancelablePromise<Overtime> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/human_resources/horaextra/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Hora Extra.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyOvertime(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/human_resources/horaextra/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns WorkSchedule
     * @throws ApiError
     */
    public static listWorkSchedules(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<WorkSchedule>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/human_resources/horario/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns WorkSchedule
     * @throws ApiError
     */
    public static createWorkSchedule(
        requestBody?: WorkSchedule,
    ): CancelablePromise<WorkSchedule> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/human_resources/horario/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Horário de Trabalho.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns WorkSchedule
     * @throws ApiError
     */
    public static retrieveWorkSchedule(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<WorkSchedule> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/human_resources/horario/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Horário de Trabalho.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns WorkSchedule
     * @throws ApiError
     */
    public static updateWorkSchedule(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: WorkSchedule,
    ): CancelablePromise<WorkSchedule> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/human_resources/horario/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Horário de Trabalho.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns WorkSchedule
     * @throws ApiError
     */
    public static partialUpdateWorkSchedule(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: WorkSchedule,
    ): CancelablePromise<WorkSchedule> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/human_resources/horario/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Horário de Trabalho.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyWorkSchedule(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/human_resources/horario/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns DisciplinaryProcess
     * @throws ApiError
     */
    public static listDisciplinaryProcesses(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<DisciplinaryProcess>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/human_resources/processodisciplinar/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns DisciplinaryProcess
     * @throws ApiError
     */
    public static createDisciplinaryProcess(
        requestBody?: DisciplinaryProcess,
    ): CancelablePromise<DisciplinaryProcess> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/human_resources/processodisciplinar/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Processo Disciplinar.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns DisciplinaryProcess
     * @throws ApiError
     */
    public static retrieveDisciplinaryProcess(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<DisciplinaryProcess> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/human_resources/processodisciplinar/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Processo Disciplinar.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns DisciplinaryProcess
     * @throws ApiError
     */
    public static updateDisciplinaryProcess(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: DisciplinaryProcess,
    ): CancelablePromise<DisciplinaryProcess> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/human_resources/processodisciplinar/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Processo Disciplinar.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns DisciplinaryProcess
     * @throws ApiError
     */
    public static partialUpdateDisciplinaryProcess(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: DisciplinaryProcess,
    ): CancelablePromise<DisciplinaryProcess> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/human_resources/processodisciplinar/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Processo Disciplinar.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyDisciplinaryProcess(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/human_resources/processodisciplinar/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Profession
     * @throws ApiError
     */
    public static listProfessions(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Profession>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/human_resources/profissao/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Profession
     * @throws ApiError
     */
    public static createProfession(
        requestBody?: Profession,
    ): CancelablePromise<Profession> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/human_resources/profissao/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Profissão.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Profession
     * @throws ApiError
     */
    public static retrieveProfession(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Profession> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/human_resources/profissao/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Profissão.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Profession
     * @throws ApiError
     */
    public static updateProfession(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Profession,
    ): CancelablePromise<Profession> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/human_resources/profissao/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Profissão.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Profession
     * @throws ApiError
     */
    public static partialUpdateProfession(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Profession,
    ): CancelablePromise<Profession> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/human_resources/profissao/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Profissão.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyProfession(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/human_resources/profissao/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns JobTitle
     * @throws ApiError
     */
    public static listJobTitles(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<JobTitle>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/human_resources/role/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns JobTitle
     * @throws ApiError
     */
    public static createJobTitle(
        requestBody?: JobTitle,
    ): CancelablePromise<JobTitle> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/human_resources/role/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Cargo.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns JobTitle
     * @throws ApiError
     */
    public static retrieveJobTitle(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<JobTitle> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/human_resources/role/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Cargo.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns JobTitle
     * @throws ApiError
     */
    public static updateJobTitle(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: JobTitle,
    ): CancelablePromise<JobTitle> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/human_resources/role/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Cargo.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns JobTitle
     * @throws ApiError
     */
    public static partialUpdateJobTitle(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: JobTitle,
    ): CancelablePromise<JobTitle> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/human_resources/role/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Cargo.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyJobTitle(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/human_resources/role/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static listCloudControlViewSets(): CancelablePromise<Array<any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/monitoring/cloud_control/',
        });
    }
    /**
     * @param requestBody
     * @returns any
     * @throws ApiError
     */
    public static createCloudControlViewSet(
        requestBody?: any,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/monitoring/cloud_control/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns SystemError
     * @throws ApiError
     */
    public static listSystemErrors(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<SystemError>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/monitoring/error/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns SystemError
     * @throws ApiError
     */
    public static createSystemError(
        requestBody?: SystemError,
    ): CancelablePromise<SystemError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/monitoring/error/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Erro do Sistema.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns SystemError
     * @throws ApiError
     */
    public static retrieveSystemError(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<SystemError> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/monitoring/error/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Erro do Sistema.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns SystemError
     * @throws ApiError
     */
    public static updateSystemError(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: SystemError,
    ): CancelablePromise<SystemError> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/monitoring/error/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Erro do Sistema.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns SystemError
     * @throws ApiError
     */
    public static partialUpdateSystemError(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: SystemError,
    ): CancelablePromise<SystemError> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/monitoring/error/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Erro do Sistema.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroySystemError(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/monitoring/error/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id
     * @returns any
     * @throws ApiError
     */
    public static retrieveExportJobViewSet(
        id: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/monitoring/export_job/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @param id
     * @returns any
     * @throws ApiError
     */
    public static downloadExportJobViewSet(
        id: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/monitoring/export_job/{id}/download/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static listTelemetryViewSets(): CancelablePromise<Array<any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/monitoring/telemetry/',
        });
    }
    /**
     * @param requestBody
     * @returns any
     * @throws ApiError
     */
    public static createTelemetryViewSet(
        requestBody?: any,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/monitoring/telemetry/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static commandCenterTelemetryViewSet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/monitoring/telemetry/command_center/',
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns GradeRecord
     * @throws ApiError
     */
    public static listGradeRecords(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<GradeRecord>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/assessment/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns GradeRecord
     * @throws ApiError
     */
    public static createGradeRecord(
        requestBody?: GradeRecord,
    ): CancelablePromise<GradeRecord> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/education/assessment/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Nota.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns GradeRecord
     * @throws ApiError
     */
    public static retrieveGradeRecord(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<GradeRecord> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/assessment/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Nota.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns GradeRecord
     * @throws ApiError
     */
    public static updateGradeRecord(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: GradeRecord,
    ): CancelablePromise<GradeRecord> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/education/assessment/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Nota.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns GradeRecord
     * @throws ApiError
     */
    public static partialUpdateGradeRecord(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: GradeRecord,
    ): CancelablePromise<GradeRecord> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/education/assessment/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Nota.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyGradeRecord(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/education/assessment/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Assignment
     * @throws ApiError
     */
    public static listAssignments(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Assignment>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/assignment/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Assignment
     * @throws ApiError
     */
    public static createAssignment(
        requestBody?: Assignment,
    ): CancelablePromise<Assignment> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/education/assignment/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Trabalho.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Assignment
     * @throws ApiError
     */
    public static retrieveAssignment(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Assignment> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/assignment/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Trabalho.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Assignment
     * @throws ApiError
     */
    public static updateAssignment(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Assignment,
    ): CancelablePromise<Assignment> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/education/assignment/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Trabalho.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Assignment
     * @throws ApiError
     */
    public static partialUpdateAssignment(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Assignment,
    ): CancelablePromise<Assignment> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/education/assignment/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Trabalho.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyAssignment(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/education/assignment/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns AttendanceRecord
     * @throws ApiError
     */
    public static listAttendanceRecords(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<AttendanceRecord>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/attendance/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns AttendanceRecord
     * @throws ApiError
     */
    public static createAttendanceRecord(
        requestBody?: AttendanceRecord,
    ): CancelablePromise<AttendanceRecord> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/education/attendance/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Presença.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns AttendanceRecord
     * @throws ApiError
     */
    public static retrieveAttendanceRecord(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<AttendanceRecord> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/attendance/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Presença.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns AttendanceRecord
     * @throws ApiError
     */
    public static updateAttendanceRecord(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: AttendanceRecord,
    ): CancelablePromise<AttendanceRecord> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/education/attendance/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Presença.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns AttendanceRecord
     * @throws ApiError
     */
    public static partialUpdateAttendanceRecord(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: AttendanceRecord,
    ): CancelablePromise<AttendanceRecord> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/education/attendance/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Presença.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyAttendanceRecord(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/education/attendance/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns LearningContent
     * @throws ApiError
     */
    public static listLearningContents(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<LearningContent>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/bibliography/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns LearningContent
     * @throws ApiError
     */
    public static createLearningContent(
        requestBody?: LearningContent,
    ): CancelablePromise<LearningContent> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/education/bibliography/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Conteúdo de Aprendizagem.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns LearningContent
     * @throws ApiError
     */
    public static retrieveLearningContent(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<LearningContent> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/bibliography/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Conteúdo de Aprendizagem.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns LearningContent
     * @throws ApiError
     */
    public static updateLearningContent(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: LearningContent,
    ): CancelablePromise<LearningContent> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/education/bibliography/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Conteúdo de Aprendizagem.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns LearningContent
     * @throws ApiError
     */
    public static partialUpdateLearningContent(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: LearningContent,
    ): CancelablePromise<LearningContent> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/education/bibliography/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Conteúdo de Aprendizagem.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyLearningContent(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/education/bibliography/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Classroom
     * @throws ApiError
     */
    public static listClassrooms(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Classroom>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/classroom/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Classroom
     * @throws ApiError
     */
    public static createClassroom(
        requestBody?: Classroom,
    ): CancelablePromise<Classroom> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/education/classroom/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Turma.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Classroom
     * @throws ApiError
     */
    public static retrieveClassroom(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Classroom> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/classroom/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Turma.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Classroom
     * @throws ApiError
     */
    public static updateClassroom(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Classroom,
    ): CancelablePromise<Classroom> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/education/classroom/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Turma.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Classroom
     * @throws ApiError
     */
    public static partialUpdateClassroom(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Classroom,
    ): CancelablePromise<Classroom> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/education/classroom/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Turma.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyClassroom(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/education/classroom/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns LearningContent
     * @throws ApiError
     */
    public static listLearningContents1(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<LearningContent>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/content/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns LearningContent
     * @throws ApiError
     */
    public static createLearningContent1(
        requestBody?: LearningContent,
    ): CancelablePromise<LearningContent> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/education/content/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Conteúdo de Aprendizagem.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns LearningContent
     * @throws ApiError
     */
    public static retrieveLearningContent1(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<LearningContent> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/content/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Conteúdo de Aprendizagem.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns LearningContent
     * @throws ApiError
     */
    public static updateLearningContent1(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: LearningContent,
    ): CancelablePromise<LearningContent> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/education/content/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Conteúdo de Aprendizagem.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns LearningContent
     * @throws ApiError
     */
    public static partialUpdateLearningContent1(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: LearningContent,
    ): CancelablePromise<LearningContent> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/education/content/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Conteúdo de Aprendizagem.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyLearningContent1(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/education/content/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Course
     * @throws ApiError
     */
    public static listCourses(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Course>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/course/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Course
     * @throws ApiError
     */
    public static createCourse(
        requestBody?: Course,
    ): CancelablePromise<Course> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/education/course/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Curso.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Course
     * @throws ApiError
     */
    public static retrieveCourse(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Course> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/course/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Curso.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Course
     * @throws ApiError
     */
    public static updateCourse(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Course,
    ): CancelablePromise<Course> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/education/course/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Curso.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Course
     * @throws ApiError
     */
    public static partialUpdateCourse(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Course,
    ): CancelablePromise<Course> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/education/course/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Curso.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyCourse(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/education/course/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns DisciplineScheduleItem
     * @throws ApiError
     */
    public static listDisciplineScheduleItems(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<DisciplineScheduleItem>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/discipline_schedule/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns DisciplineScheduleItem
     * @throws ApiError
     */
    public static createDisciplineScheduleItem(
        requestBody?: DisciplineScheduleItem,
    ): CancelablePromise<DisciplineScheduleItem> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/education/discipline_schedule/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Item do Cronograma da Disciplina.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns DisciplineScheduleItem
     * @throws ApiError
     */
    public static retrieveDisciplineScheduleItem(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<DisciplineScheduleItem> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/discipline_schedule/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Item do Cronograma da Disciplina.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns DisciplineScheduleItem
     * @throws ApiError
     */
    public static updateDisciplineScheduleItem(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: DisciplineScheduleItem,
    ): CancelablePromise<DisciplineScheduleItem> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/education/discipline_schedule/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Item do Cronograma da Disciplina.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns DisciplineScheduleItem
     * @throws ApiError
     */
    public static partialUpdateDisciplineScheduleItem(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: DisciplineScheduleItem,
    ): CancelablePromise<DisciplineScheduleItem> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/education/discipline_schedule/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Item do Cronograma da Disciplina.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyDisciplineScheduleItem(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/education/discipline_schedule/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Enrollment
     * @throws ApiError
     */
    public static listEnrollments(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Enrollment>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/enrollment/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Enrollment
     * @throws ApiError
     */
    public static createEnrollment(
        requestBody?: Enrollment,
    ): CancelablePromise<Enrollment> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/education/enrollment/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Matrícula.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Enrollment
     * @throws ApiError
     */
    public static retrieveEnrollment(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Enrollment> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/enrollment/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Matrícula.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Enrollment
     * @throws ApiError
     */
    public static updateEnrollment(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Enrollment,
    ): CancelablePromise<Enrollment> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/education/enrollment/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Matrícula.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Enrollment
     * @throws ApiError
     */
    public static partialUpdateEnrollment(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Enrollment,
    ): CancelablePromise<Enrollment> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/education/enrollment/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Matrícula.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyEnrollment(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/education/enrollment/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ExaminationAttempt
     * @throws ApiError
     */
    public static listExaminationAttempts(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<ExaminationAttempt>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/exam_attempt/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns ExaminationAttempt
     * @throws ApiError
     */
    public static createExaminationAttempt(
        requestBody?: ExaminationAttempt,
    ): CancelablePromise<ExaminationAttempt> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/education/exam_attempt/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Tentativa de Exame.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ExaminationAttempt
     * @throws ApiError
     */
    public static retrieveExaminationAttempt(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<ExaminationAttempt> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/exam_attempt/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Tentativa de Exame.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ExaminationAttempt
     * @throws ApiError
     */
    public static updateExaminationAttempt(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ExaminationAttempt,
    ): CancelablePromise<ExaminationAttempt> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/education/exam_attempt/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Tentativa de Exame.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ExaminationAttempt
     * @throws ApiError
     */
    public static partialUpdateExaminationAttempt(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ExaminationAttempt,
    ): CancelablePromise<ExaminationAttempt> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/education/exam_attempt/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Tentativa de Exame.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyExaminationAttempt(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/education/exam_attempt/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Examination
     * @throws ApiError
     */
    public static listExaminations(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Examination>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/examination/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Examination
     * @throws ApiError
     */
    public static createExamination(
        requestBody?: Examination,
    ): CancelablePromise<Examination> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/education/examination/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Exame.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Examination
     * @throws ApiError
     */
    public static retrieveExamination(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Examination> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/examination/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Exame.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Examination
     * @throws ApiError
     */
    public static updateExamination(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Examination,
    ): CancelablePromise<Examination> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/education/examination/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Exame.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Examination
     * @throws ApiError
     */
    public static partialUpdateExamination(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Examination,
    ): CancelablePromise<Examination> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/education/examination/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Exame.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyExamination(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/education/examination/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ExaminationAttempt
     * @throws ApiError
     */
    public static listExaminationAttempts1(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<ExaminationAttempt>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/examination_attempt/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns ExaminationAttempt
     * @throws ApiError
     */
    public static createExaminationAttempt1(
        requestBody?: ExaminationAttempt,
    ): CancelablePromise<ExaminationAttempt> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/education/examination_attempt/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Tentativa de Exame.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns ExaminationAttempt
     * @throws ApiError
     */
    public static retrieveExaminationAttempt1(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<ExaminationAttempt> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/examination_attempt/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Tentativa de Exame.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ExaminationAttempt
     * @throws ApiError
     */
    public static updateExaminationAttempt1(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ExaminationAttempt,
    ): CancelablePromise<ExaminationAttempt> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/education/examination_attempt/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Tentativa de Exame.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns ExaminationAttempt
     * @throws ApiError
     */
    public static partialUpdateExaminationAttempt1(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: ExaminationAttempt,
    ): CancelablePromise<ExaminationAttempt> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/education/examination_attempt/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Tentativa de Exame.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyExaminationAttempt1(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/education/examination_attempt/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns GradeRecord
     * @throws ApiError
     */
    public static listGradeRecords1(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<GradeRecord>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/grade/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns GradeRecord
     * @throws ApiError
     */
    public static createGradeRecord1(
        requestBody?: GradeRecord,
    ): CancelablePromise<GradeRecord> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/education/grade/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Nota.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns GradeRecord
     * @throws ApiError
     */
    public static retrieveGradeRecord1(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<GradeRecord> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/grade/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Nota.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns GradeRecord
     * @throws ApiError
     */
    public static updateGradeRecord1(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: GradeRecord,
    ): CancelablePromise<GradeRecord> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/education/grade/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Nota.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns GradeRecord
     * @throws ApiError
     */
    public static partialUpdateGradeRecord1(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: GradeRecord,
    ): CancelablePromise<GradeRecord> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/education/grade/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Nota.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyGradeRecord1(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/education/grade/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns LearningContent
     * @throws ApiError
     */
    public static listLearningContents2(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<LearningContent>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/lesson/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns LearningContent
     * @throws ApiError
     */
    public static createLearningContent2(
        requestBody?: LearningContent,
    ): CancelablePromise<LearningContent> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/education/lesson/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Conteúdo de Aprendizagem.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns LearningContent
     * @throws ApiError
     */
    public static retrieveLearningContent2(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<LearningContent> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/lesson/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Conteúdo de Aprendizagem.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns LearningContent
     * @throws ApiError
     */
    public static updateLearningContent2(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: LearningContent,
    ): CancelablePromise<LearningContent> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/education/lesson/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Conteúdo de Aprendizagem.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns LearningContent
     * @throws ApiError
     */
    public static partialUpdateLearningContent2(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: LearningContent,
    ): CancelablePromise<LearningContent> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/education/lesson/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Conteúdo de Aprendizagem.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyLearningContent2(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/education/lesson/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns RandomTest
     * @throws ApiError
     */
    public static listRandomTests(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<RandomTest>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/random_test/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns RandomTest
     * @throws ApiError
     */
    public static createRandomTest(
        requestBody?: RandomTest,
    ): CancelablePromise<RandomTest> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/education/random_test/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Teste Aleatório.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns RandomTest
     * @throws ApiError
     */
    public static retrieveRandomTest(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<RandomTest> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/random_test/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Teste Aleatório.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns RandomTest
     * @throws ApiError
     */
    public static updateRandomTest(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: RandomTest,
    ): CancelablePromise<RandomTest> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/education/random_test/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Teste Aleatório.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns RandomTest
     * @throws ApiError
     */
    public static partialUpdateRandomTest(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: RandomTest,
    ): CancelablePromise<RandomTest> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/education/random_test/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Teste Aleatório.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyRandomTest(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/education/random_test/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns DisciplineScheduleStudentStatus
     * @throws ApiError
     */
    public static listDisciplineScheduleStudentStatuses(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<DisciplineScheduleStudentStatus>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/schedule_progress/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns DisciplineScheduleStudentStatus
     * @throws ApiError
     */
    public static createDisciplineScheduleStudentStatus(
        requestBody?: DisciplineScheduleStudentStatus,
    ): CancelablePromise<DisciplineScheduleStudentStatus> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/education/schedule_progress/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Estado do Estudante no Cronograma.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns DisciplineScheduleStudentStatus
     * @throws ApiError
     */
    public static retrieveDisciplineScheduleStudentStatus(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<DisciplineScheduleStudentStatus> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/schedule_progress/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Estado do Estudante no Cronograma.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns DisciplineScheduleStudentStatus
     * @throws ApiError
     */
    public static updateDisciplineScheduleStudentStatus(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: DisciplineScheduleStudentStatus,
    ): CancelablePromise<DisciplineScheduleStudentStatus> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/education/schedule_progress/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Estado do Estudante no Cronograma.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns DisciplineScheduleStudentStatus
     * @throws ApiError
     */
    public static partialUpdateDisciplineScheduleStudentStatus(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: DisciplineScheduleStudentStatus,
    ): CancelablePromise<DisciplineScheduleStudentStatus> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/education/schedule_progress/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Estado do Estudante no Cronograma.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyDisciplineScheduleStudentStatus(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/education/schedule_progress/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Skill
     * @throws ApiError
     */
    public static listSkills(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<Skill>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/skill/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Skill
     * @throws ApiError
     */
    public static createSkill(
        requestBody?: Skill,
    ): CancelablePromise<Skill> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/education/skill/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Competência.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns Skill
     * @throws ApiError
     */
    public static retrieveSkill(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<Skill> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/skill/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Competência.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Skill
     * @throws ApiError
     */
    public static updateSkill(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Skill,
    ): CancelablePromise<Skill> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/education/skill/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Competência.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns Skill
     * @throws ApiError
     */
    public static partialUpdateSkill(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: Skill,
    ): CancelablePromise<Skill> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/education/skill/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Competência.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroySkill(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/education/skill/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns StudentProfile
     * @throws ApiError
     */
    public static listStudentProfiles(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<StudentProfile>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/student/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns StudentProfile
     * @throws ApiError
     */
    public static createStudentProfile(
        requestBody?: StudentProfile,
    ): CancelablePromise<StudentProfile> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/education/student/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Estudante.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns StudentProfile
     * @throws ApiError
     */
    public static retrieveStudentProfile(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<StudentProfile> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/student/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Estudante.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns StudentProfile
     * @throws ApiError
     */
    public static updateStudentProfile(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: StudentProfile,
    ): CancelablePromise<StudentProfile> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/education/student/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Estudante.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns StudentProfile
     * @throws ApiError
     */
    public static partialUpdateStudentProfile(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: StudentProfile,
    ): CancelablePromise<StudentProfile> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/education/student/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Estudante.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyStudentProfile(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/education/student/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns AssignmentSubmission
     * @throws ApiError
     */
    public static listAssignmentSubmissions(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<AssignmentSubmission>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/submission/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns AssignmentSubmission
     * @throws ApiError
     */
    public static createAssignmentSubmission(
        requestBody?: AssignmentSubmission,
    ): CancelablePromise<AssignmentSubmission> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/education/submission/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Submissão de Trabalho.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns AssignmentSubmission
     * @throws ApiError
     */
    public static retrieveAssignmentSubmission(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<AssignmentSubmission> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/submission/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Submissão de Trabalho.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns AssignmentSubmission
     * @throws ApiError
     */
    public static updateAssignmentSubmission(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: AssignmentSubmission,
    ): CancelablePromise<AssignmentSubmission> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/education/submission/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Submissão de Trabalho.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns AssignmentSubmission
     * @throws ApiError
     */
    public static partialUpdateAssignmentSubmission(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: AssignmentSubmission,
    ): CancelablePromise<AssignmentSubmission> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/education/submission/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Submissão de Trabalho.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyAssignmentSubmission(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/education/submission/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns TeacherProfile
     * @throws ApiError
     */
    public static listTeacherProfiles(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<TeacherProfile>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/teacher/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns TeacherProfile
     * @throws ApiError
     */
    public static createTeacherProfile(
        requestBody?: TeacherProfile,
    ): CancelablePromise<TeacherProfile> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/education/teacher/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Professor.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns TeacherProfile
     * @throws ApiError
     */
    public static retrieveTeacherProfile(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<TeacherProfile> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/teacher/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Professor.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns TeacherProfile
     * @throws ApiError
     */
    public static updateTeacherProfile(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: TeacherProfile,
    ): CancelablePromise<TeacherProfile> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/education/teacher/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Professor.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns TeacherProfile
     * @throws ApiError
     */
    public static partialUpdateTeacherProfile(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: TeacherProfile,
    ): CancelablePromise<TeacherProfile> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/education/teacher/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Professor.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyTeacherProfile(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/education/teacher/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns LearningContent
     * @throws ApiError
     */
    public static listLearningContents3(
        search?: string,
        ordering?: string,
    ): CancelablePromise<Array<LearningContent>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/thematic_map/',
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param requestBody
     * @returns LearningContent
     * @throws ApiError
     */
    public static createLearningContent3(
        requestBody?: LearningContent,
    ): CancelablePromise<LearningContent> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/education/thematic_map/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Conteúdo de Aprendizagem.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns LearningContent
     * @throws ApiError
     */
    public static retrieveLearningContent3(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<LearningContent> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/education/thematic_map/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * @param id A unique integer value identifying this Conteúdo de Aprendizagem.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns LearningContent
     * @throws ApiError
     */
    public static updateLearningContent3(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: LearningContent,
    ): CancelablePromise<LearningContent> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/education/thematic_map/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Conteúdo de Aprendizagem.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @param requestBody
     * @returns LearningContent
     * @throws ApiError
     */
    public static partialUpdateLearningContent3(
        id: string,
        search?: string,
        ordering?: string,
        requestBody?: LearningContent,
    ): CancelablePromise<LearningContent> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/education/thematic_map/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A unique integer value identifying this Conteúdo de Aprendizagem.
     * @param search A search term.
     * @param ordering Which field to use when ordering the results.
     * @returns void
     * @throws ApiError
     */
    public static destroyLearningContent3(
        id: string,
        search?: string,
        ordering?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/education/thematic_map/{id}/',
            path: {
                'id': id,
            },
            query: {
                'search': search,
                'ordering': ordering,
            },
        });
    }
    /**
     * Endpoint placeholder para `/api/schema/` quando a lib não está presente.
     * @returns any
     * @throws ApiError
     */
    public static listSpectaculars(): CancelablePromise<Array<any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/schema/',
        });
    }
    /**
     * Endpoint placeholder para a UI Swagger da documentação.
     * @returns any
     * @throws ApiError
     */
    public static listSpectacularSwaggers(): CancelablePromise<Array<any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/docs/',
        });
    }
    /**
     * Endpoint placeholder para a UI Redoc da documentação.
     * @returns any
     * @throws ApiError
     */
    public static listSpectacularRedocs(): CancelablePromise<Array<any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/redoc/',
        });
    }
    /**
     * @param requestBody
     * @returns SessionTokenObtainPair
     * @throws ApiError
     */
    public static createSessionTokenObtainPair(
        requestBody?: SessionTokenObtainPair,
    ): CancelablePromise<SessionTokenObtainPair> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/login/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param requestBody
     * @returns SessionTokenRefresh
     * @throws ApiError
     */
    public static createSessionTokenRefresh(
        requestBody?: SessionTokenRefresh,
    ): CancelablePromise<SessionTokenRefresh> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/refresh/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param requestBody
     * @returns any
     * @throws ApiError
     */
    public static createLogout(
        requestBody?: any,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/logout/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param requestBody
     * @returns any
     * @throws ApiError
     */
    public static createLanguageSwitch(
        requestBody?: any,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/language/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param requestBody
     * @returns any
     * @throws ApiError
     */
    public static createPasswordResetRequest(
        requestBody?: any,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/password-reset/request/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param requestBody
     * @returns any
     * @throws ApiError
     */
    public static createPasswordResetConfirm(
        requestBody?: any,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/password-reset/confirm/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param requestBody
     * @returns any
     * @throws ApiError
     */
    public static createPasswordChange(
        requestBody?: any,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/password/change/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param requestBody
     * @returns any
     * @throws ApiError
     */
    public static createAiAssistantChat(
        requestBody?: any,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/ai/assistant/chat/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param investigationId
     * @param requestBody
     * @returns any
     * @throws ApiError
     */
    public static createAiAssistantInvestigationFollowUp(
        investigationId: string,
        requestBody?: any,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/ai/assistant/investigations/{investigation_id}/follow-up/',
            path: {
                'investigation_id': investigationId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param actionId
     * @param requestBody
     * @returns any
     * @throws ApiError
     */
    public static createAiAssistantActionConfirm(
        actionId: string,
        requestBody?: any,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/ai/assistant/actions/{action_id}/confirm/',
            path: {
                'action_id': actionId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param actionId
     * @param requestBody
     * @returns any
     * @throws ApiError
     */
    public static createAiAssistantActionCancel(
        actionId: string,
        requestBody?: any,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/ai/assistant/actions/{action_id}/cancel/',
            path: {
                'action_id': actionId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Inbox de resultados para equipamentos (HTTP JSON).
     *
     * Autenticação: header `X-Integration-Key`.
     *
     * Payload (exemplo):
     * {
         * "message_id": "uuid-externo-opcional",
         * "accession": "ORD-....",
         * "results": [{"code": "HB", "value": "13.2"}, ...],
         * "documents": [{"filename":"ecg.pdf","content_type":"application/pdf","base64":"...","request_item_id": 123}]
         * }
         * @param equipmentCustomId
         * @param requestBody
         * @returns any
         * @throws ApiError
         */
        public static createEquipmentResultsInbox(
            equipmentCustomId: string,
            requestBody?: any,
        ): CancelablePromise<any> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/equipment_integrations/equipment/{equipment_custom_id}/results/',
                path: {
                    'equipment_custom_id': equipmentCustomId,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Save the result value and move to AGUARDANDO_VALIDACAO.
         * @param id A unique integer value identifying this result item.
         * @param requestBody
         * @returns ResultItem
         * @throws ApiError
         */
        public static saveResultResultItem(
            id: string,
            requestBody?: ResultItem,
        ): CancelablePromise<ResultItem> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/clinical/resultitem/{id}/gravar/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Move the result item to EM_ANALISE.
         * @param id A unique integer value identifying this result item.
         * @param requestBody
         * @returns ResultItem
         * @throws ApiError
         */
        public static startAnalysisResultItem(
            id: string,
            requestBody?: ResultItem,
        ): CancelablePromise<ResultItem> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/clinical/resultitem/{id}/lancar/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Move the result item to VALIDADO.
         * @param id A unique integer value identifying this result item.
         * @param requestBody
         * @returns ResultItem
         * @throws ApiError
         */
        public static validateResultResultItem(
            id: string,
            requestBody?: ResultItem,
        ): CancelablePromise<ResultItem> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/clinical/resultitem/{id}/validar/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Consulta Médica.
         * @param requestBody
         * @returns MedicalConsultation
         * @throws ApiError
         */
        public static cancelMedicalConsultation(
            id: string,
            requestBody?: MedicalConsultation,
        ): CancelablePromise<MedicalConsultation> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/consultations/consultation/{id}/cancel/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Consulta Médica.
         * @param requestBody
         * @returns MedicalConsultation
         * @throws ApiError
         */
        public static cancelLegacyMedicalConsultation(
            id: string,
            requestBody?: MedicalConsultation,
        ): CancelablePromise<MedicalConsultation> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/consultations/consultation/{id}/cancelar/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Consulta Médica.
         * @param requestBody
         * @returns MedicalConsultation
         * @throws ApiError
         */
        public static completeMedicalConsultation(
            id: string,
            requestBody?: MedicalConsultation,
        ): CancelablePromise<MedicalConsultation> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/consultations/consultation/{id}/complete/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Consulta Médica.
         * @param requestBody
         * @returns MedicalConsultation
         * @throws ApiError
         */
        public static completeLegacyMedicalConsultation(
            id: string,
            requestBody?: MedicalConsultation,
        ): CancelablePromise<MedicalConsultation> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/consultations/consultation/{id}/concluir/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Consulta Médica.
         * @param requestBody
         * @returns MedicalConsultation
         * @throws ApiError
         */
        public static createInvoiceMedicalConsultation(
            id: string,
            requestBody?: MedicalConsultation,
        ): CancelablePromise<MedicalConsultation> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/consultations/consultation/{id}/create-invoice/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Consulta Médica.
         * @param requestBody
         * @returns MedicalConsultation
         * @throws ApiError
         */
        public static createInvoiceLegacyMedicalConsultation(
            id: string,
            requestBody?: MedicalConsultation,
        ): CancelablePromise<MedicalConsultation> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/consultations/consultation/{id}/criar_invoice/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Consulta Médica.
         * @param requestBody
         * @returns MedicalConsultation
         * @throws ApiError
         */
        public static rescheduleMedicalConsultation(
            id: string,
            requestBody?: MedicalConsultation,
        ): CancelablePromise<MedicalConsultation> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/consultations/consultation/{id}/reschedule/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Consulta Médica.
         * @param requestBody
         * @returns MedicalConsultation
         * @throws ApiError
         */
        public static rescheduleLegacyMedicalConsultation(
            id: string,
            requestBody?: MedicalConsultation,
        ): CancelablePromise<MedicalConsultation> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/consultations/consultation/{id}/remarcar/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Procedimento de Enfermagem - Item.
         * @param requestBody
         * @returns ProcedureItem
         * @throws ApiError
         */
        public static completeProcedureItem(
            id: string,
            requestBody?: ProcedureItem,
        ): CancelablePromise<ProcedureItem> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/nursing/procedure_item/{id}/complete/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Procedimento de Enfermagem - Item.
         * @param requestBody
         * @returns ProcedureItem
         * @throws ApiError
         */
        public static executeProcedureItem(
            id: string,
            requestBody?: ProcedureItem,
        ): CancelablePromise<ProcedureItem> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/nursing/procedure_item/{id}/execute/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Procedimento de Enfermagem - Item.
         * @param requestBody
         * @returns ProcedureItem
         * @throws ApiError
         */
        public static markBilledProcedureItem(
            id: string,
            requestBody?: ProcedureItem,
        ): CancelablePromise<ProcedureItem> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/nursing/procedure_item/{id}/mark-billed/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Procedimento de Enfermagem - Item.
         * @param requestBody
         * @returns ProcedureItem
         * @throws ApiError
         */
        public static markNotCompletedProcedureItem(
            id: string,
            requestBody?: ProcedureItem,
        ): CancelablePromise<ProcedureItem> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/nursing/procedure_item/{id}/mark-not-completed/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Ocorrência.
         * @param requestBody
         * @returns Incident
         * @throws ApiError
         */
        public static performMaintenanceIncident(
            id: string,
            requestBody?: Incident,
        ): CancelablePromise<Incident> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/equipment/incident/{id}/perform-maintenance/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Requisição de material.
         * @param requestBody
         * @returns MaterialRequisition
         * @throws ApiError
         */
        public static archiveMaterialRequisition(
            id: string,
            requestBody?: MaterialRequisition,
        ): CancelablePromise<MaterialRequisition> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/pharmacy/material_requisition/{id}/archive/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Requisição de material.
         * @param requestBody
         * @returns MaterialRequisition
         * @throws ApiError
         */
        public static fulfillMaterialRequisition(
            id: string,
            requestBody?: MaterialRequisition,
        ): CancelablePromise<MaterialRequisition> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/pharmacy/material_requisition/{id}/fulfill/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Inventário Cíclico.
         * @param requestBody
         * @returns CycleCount
         * @throws ApiError
         */
        public static postDocumentCycleCount(
            id: string,
            requestBody?: CycleCount,
        ): CancelablePromise<CycleCount> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/warehouse/cycle_count/{id}/post/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Recebimento de Compra.
         * @param requestBody
         * @returns GoodsReceipt
         * @throws ApiError
         */
        public static postDocumentGoodsReceipt(
            id: string,
            requestBody?: GoodsReceipt,
        ): CancelablePromise<GoodsReceipt> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/warehouse/goods_receipt/{id}/post/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Lista de Separação.
         * @param requestBody
         * @returns PickList
         * @throws ApiError
         */
        public static markPickedPickList(
            id: string,
            requestBody?: PickList,
        ): CancelablePromise<PickList> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/warehouse/pick_list/{id}/complete/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Plano de Reposição.
         * @param requestBody
         * @returns ReplenishmentPlan
         * @throws ApiError
         */
        public static createPurchaseOrderReplenishmentPlan(
            id: string,
            requestBody?: ReplenishmentPlan,
        ): CancelablePromise<ReplenishmentPlan> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/warehouse/replenishment_plan/{id}/create-purchase-order/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Plano de Reposição.
         * @param requestBody
         * @returns ReplenishmentPlan
         * @throws ApiError
         */
        public static generatePlanReplenishmentPlan(
            id: string,
            requestBody?: ReplenishmentPlan,
        ): CancelablePromise<ReplenishmentPlan> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/warehouse/replenishment_plan/{id}/generate/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Pedido de Venda.
         * @param requestBody
         * @returns SalesOrder
         * @throws ApiError
         */
        public static allocateOrderSalesOrder(
            id: string,
            requestBody?: SalesOrder,
        ): CancelablePromise<SalesOrder> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/warehouse/sales_order/{id}/allocate/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Pedido de Venda.
         * @param requestBody
         * @returns SalesOrder
         * @throws ApiError
         */
        public static cancelOrderSalesOrder(
            id: string,
            requestBody?: SalesOrder,
        ): CancelablePromise<SalesOrder> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/warehouse/sales_order/{id}/cancel/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Pedido de Venda.
         * @param requestBody
         * @returns SalesOrder
         * @throws ApiError
         */
        public static confirmOrderSalesOrder(
            id: string,
            requestBody?: SalesOrder,
        ): CancelablePromise<SalesOrder> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/warehouse/sales_order/{id}/confirm/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Pedido de Venda.
         * @param requestBody
         * @returns SalesOrder
         * @throws ApiError
         */
        public static createPickListSalesOrder(
            id: string,
            requestBody?: SalesOrder,
        ): CancelablePromise<SalesOrder> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/warehouse/sales_order/{id}/create-pick-list/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Pedido de Venda.
         * @param requestBody
         * @returns SalesOrder
         * @throws ApiError
         */
        public static shipOrderSalesOrder(
            id: string,
            requestBody?: SalesOrder,
        ): CancelablePromise<SalesOrder> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/warehouse/sales_order/{id}/ship/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Expedição.
         * @param requestBody
         * @returns Shipment
         * @throws ApiError
         */
        public static postDocumentShipment(
            id: string,
            requestBody?: Shipment,
        ): CancelablePromise<Shipment> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/warehouse/shipment/{id}/post/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Expedição.
         * @param requestBody
         * @returns Shipment
         * @throws ApiError
         */
        public static shipDocumentShipment(
            id: string,
            requestBody?: Shipment,
        ): CancelablePromise<Shipment> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/warehouse/shipment/{id}/ship/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Reserva de Estoque.
         * @param requestBody
         * @returns StockReservation
         * @throws ApiError
         */
        public static releaseReservationStockReservation(
            id: string,
            requestBody?: StockReservation,
        ): CancelablePromise<StockReservation> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/warehouse/stock_reservation/{id}/release/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Transferência de Estoque.
         * @param requestBody
         * @returns StockTransfer
         * @throws ApiError
         */
        public static postDocumentStockTransfer(
            id: string,
            requestBody?: StockTransfer,
        ): CancelablePromise<StockTransfer> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/warehouse/stock_transfer/{id}/post/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Fatura.
         * @param requestBody
         * @returns Invoice
         * @throws ApiError
         */
        public static confirmPaymentInvoice(
            id: string,
            requestBody?: Invoice,
        ): CancelablePromise<Invoice> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/billing/invoice/{id}/confirm-payment/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Fatura.
         * @param requestBody
         * @returns Invoice
         * @throws ApiError
         */
        public static confirmPaymentLegacyInvoice(
            id: string,
            requestBody?: Invoice,
        ): CancelablePromise<Invoice> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/billing/invoice/{id}/confirm-payment-legacy/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Alias em português para confirmar pagamento pendente.
         * @param id A unique integer value identifying this Fatura.
         * @param requestBody
         * @returns Invoice
         * @throws ApiError
         */
        public static confirmPaymentPtInvoice(
            id: string,
            requestBody?: Invoice,
        ): CancelablePromise<Invoice> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/billing/invoice/{id}/confirmar_pagamento/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Fatura.
         * @param requestBody
         * @returns Invoice
         * @throws ApiError
         */
        public static issueInvoice(
            id: string,
            requestBody?: Invoice,
        ): CancelablePromise<Invoice> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/billing/invoice/{id}/issue/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Fatura.
         * @param requestBody
         * @returns Invoice
         * @throws ApiError
         */
        public static issueLegacyInvoice(
            id: string,
            requestBody?: Invoice,
        ): CancelablePromise<Invoice> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/billing/invoice/{id}/emitir/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Fatura.
         * @param requestBody
         * @returns Invoice
         * @throws ApiError
         */
        public static voidInvoice(
            id: string,
            requestBody?: Invoice,
        ): CancelablePromise<Invoice> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/billing/invoice/{id}/void/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Fatura.
         * @param requestBody
         * @returns Invoice
         * @throws ApiError
         */
        public static voidLegacyInvoice(
            id: string,
            requestBody?: Invoice,
        ): CancelablePromise<Invoice> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/billing/invoice/{id}/anular/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Unidade de sangue.
         * @param requestBody
         * @returns BloodUnit
         * @throws ApiError
         */
        public static forwardToSectorBloodUnit(
            id: string,
            requestBody?: BloodUnit,
        ): CancelablePromise<BloodUnit> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/bloodbank/unit/{id}/forward-to-sector/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Unidade de sangue.
         * @param requestBody
         * @returns BloodUnit
         * @throws ApiError
         */
        public static registerDispatchOutcomeBloodUnit(
            id: string,
            requestBody?: BloodUnit,
        ): CancelablePromise<BloodUnit> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/bloodbank/unit/{id}/register-dispatch-outcome/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Unidade de sangue.
         * @param requestBody
         * @returns BloodUnit
         * @throws ApiError
         */
        public static releaseBloodUnit(
            id: string,
            requestBody?: BloodUnit,
        ): CancelablePromise<BloodUnit> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/bloodbank/unit/{id}/release/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Unidade de sangue.
         * @param requestBody
         * @returns BloodUnit
         * @throws ApiError
         */
        public static reserveBloodUnit(
            id: string,
            requestBody?: BloodUnit,
        ): CancelablePromise<BloodUnit> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/bloodbank/unit/{id}/reserve/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Unidade de sangue.
         * @param requestBody
         * @returns BloodUnit
         * @throws ApiError
         */
        public static transfuseBloodUnit(
            id: string,
            requestBody?: BloodUnit,
        ): CancelablePromise<BloodUnit> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/bloodbank/unit/{id}/transfuse/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Usuário.
         * @param requestBody
         * @returns User
         * @throws ApiError
         */
        public static activateUser(
            id: string,
            requestBody?: User,
        ): CancelablePromise<User> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/identity/user/{id}/ativar/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Usuário.
         * @param requestBody
         * @returns User
         * @throws ApiError
         */
        public static activateEnUser(
            id: string,
            requestBody?: User,
        ): CancelablePromise<User> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/identity/user/{id}/activate/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Usuário.
         * @param requestBody
         * @returns User
         * @throws ApiError
         */
        public static deactivateUser(
            id: string,
            requestBody?: User,
        ): CancelablePromise<User> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/identity/user/{id}/desativar/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Usuário.
         * @param requestBody
         * @returns User
         * @throws ApiError
         */
        public static deactivateEnUser(
            id: string,
            requestBody?: User,
        ): CancelablePromise<User> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/identity/user/{id}/deactivate/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Pagamento.
         * @param requestBody
         * @returns Payment
         * @throws ApiError
         */
        public static confirmPayment(
            id: string,
            requestBody?: Payment,
        ): CancelablePromise<Payment> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/payments/payment/{id}/confirm/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Pagamento.
         * @param requestBody
         * @returns Payment
         * @throws ApiError
         */
        public static confirmLegacyPayment(
            id: string,
            requestBody?: Payment,
        ): CancelablePromise<Payment> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/payments/payment/{id}/confirmar/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Pagamento.
         * @param requestBody
         * @returns Payment
         * @throws ApiError
         */
        public static refundPayment(
            id: string,
            requestBody?: Payment,
        ): CancelablePromise<Payment> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/payments/payment/{id}/refund/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Pagamento.
         * @param requestBody
         * @returns Payment
         * @throws ApiError
         */
        public static refundLegacyPayment(
            id: string,
            requestBody?: Payment,
        ): CancelablePromise<Payment> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/payments/payment/{id}/estornar/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Reconciliação.
         * @param requestBody
         * @returns Reconciliation
         * @throws ApiError
         */
        public static confirmReconciliation(
            id: string,
            requestBody?: Reconciliation,
        ): CancelablePromise<Reconciliation> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/payments/reconciliation/{id}/confirm/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Reconciliação.
         * @param requestBody
         * @returns Reconciliation
         * @throws ApiError
         */
        public static confirmLegacyReconciliation(
            id: string,
            requestBody?: Reconciliation,
        ): CancelablePromise<Reconciliation> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/payments/reconciliation/{id}/confirmar/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Transação.
         * @param requestBody
         * @returns Transaction
         * @throws ApiError
         */
        public static reconcileTransaction(
            id: string,
            requestBody?: Transaction,
        ): CancelablePromise<Transaction> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/payments/transaction/{id}/reconcile/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Transação.
         * @param requestBody
         * @returns Transaction
         * @throws ApiError
         */
        public static reconcileLegacyTransaction(
            id: string,
            requestBody?: Transaction,
        ): CancelablePromise<Transaction> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/payments/transaction/{id}/reconciliar/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Transação.
         * @param requestBody
         * @returns Transaction
         * @throws ApiError
         */
        public static verifyTransaction(
            id: string,
            requestBody?: Transaction,
        ): CancelablePromise<Transaction> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/payments/transaction/{id}/verify/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Transação.
         * @param requestBody
         * @returns Transaction
         * @throws ApiError
         */
        public static verifyLegacyTransaction(
            id: string,
            requestBody?: Transaction,
        ): CancelablePromise<Transaction> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/payments/transaction/{id}/verificar/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * Ações avulsas do fluxo de cuidado (pagar, criar requisição/fatura).
         * @param requestBody
         * @returns any
         * @throws ApiError
         */
        public static createReceptionCareViewSet(
            requestBody?: any,
        ): CancelablePromise<any> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/reception/atendimento/',
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * CRUD de check-ins, com ações para request, invoice e pagamento.
         * @param id A unique integer value identifying this Check-in.
         * @param requestBody
         * @returns ReceptionCheckin
         * @throws ApiError
         */
        public static cancelReceptionCheckin(
            id: string,
            requestBody?: ReceptionCheckin,
        ): CancelablePromise<ReceptionCheckin> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/reception/checkin/{id}/cancelar/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * CRUD de check-ins, com ações para request, invoice e pagamento.
         * @param id A unique integer value identifying this Check-in.
         * @param requestBody
         * @returns ReceptionCheckin
         * @throws ApiError
         */
        public static completeReceptionCheckin(
            id: string,
            requestBody?: ReceptionCheckin,
        ): CancelablePromise<ReceptionCheckin> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/reception/checkin/{id}/concluir/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * CRUD de check-ins, com ações para request, invoice e pagamento.
         * @param id A unique integer value identifying this Check-in.
         * @param requestBody
         * @returns ReceptionCheckin
         * @throws ApiError
         */
        public static createInvoiceReceptionCheckin(
            id: string,
            requestBody?: ReceptionCheckin,
        ): CancelablePromise<ReceptionCheckin> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/reception/checkin/{id}/criar_invoice/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * CRUD de check-ins, com ações para request, invoice e pagamento.
         * @param id A unique integer value identifying this Check-in.
         * @param requestBody
         * @returns ReceptionCheckin
         * @throws ApiError
         */
        public static createRequestReceptionCheckin(
            id: string,
            requestBody?: ReceptionCheckin,
        ): CancelablePromise<ReceptionCheckin> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/reception/checkin/{id}/criar_request/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * CRUD de check-ins, com ações para request, invoice e pagamento.
         * @param id A unique integer value identifying this Check-in.
         * @param requestBody
         * @returns ReceptionCheckin
         * @throws ApiError
         */
        public static linkInvoiceReceptionCheckin(
            id: string,
            requestBody?: ReceptionCheckin,
        ): CancelablePromise<ReceptionCheckin> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/reception/checkin/{id}/vincular_invoice/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * CRUD de check-ins, com ações para request, invoice e pagamento.
         * @param id A unique integer value identifying this Check-in.
         * @param requestBody
         * @returns ReceptionCheckin
         * @throws ApiError
         */
        public static linkRequestReceptionCheckin(
            id: string,
            requestBody?: ReceptionCheckin,
        ): CancelablePromise<ReceptionCheckin> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/reception/checkin/{id}/vincular_request/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * CRUD de check-ins, com ações para request, invoice e pagamento.
         * @param id A unique integer value identifying this Check-in.
         * @param requestBody
         * @returns ReceptionCheckin
         * @throws ApiError
         */
        public static registerPaymentReceptionCheckin(
            id: string,
            requestBody?: ReceptionCheckin,
        ): CancelablePromise<ReceptionCheckin> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/reception/checkin/{id}/registrar_payment/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * CRUD de check-ins, com ações para request, invoice e pagamento.
         * @param id A unique integer value identifying this Check-in.
         * @param requestBody
         * @returns ReceptionCheckin
         * @throws ApiError
         */
        public static startCareReceptionCheckin(
            id: string,
            requestBody?: ReceptionCheckin,
        ): CancelablePromise<ReceptionCheckin> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/reception/checkin/{id}/iniciar_atendimento/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Grande cirurgia.
         * @param requestBody
         * @returns LargeSurgery
         * @throws ApiError
         */
        public static createInvoiceLargeSurgery(
            id: string,
            requestBody?: LargeSurgery,
        ): CancelablePromise<LargeSurgery> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/surgery/large_surgery/{id}/create-invoice/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Pequena cirurgia.
         * @param requestBody
         * @returns SmallSurgery
         * @throws ApiError
         */
        public static createInvoiceSmallSurgery(
            id: string,
            requestBody?: SmallSurgery,
        ): CancelablePromise<SmallSurgery> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/surgery/small_surgery/{id}/create-invoice/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Cirurgia.
         * @param requestBody
         * @returns Surgery
         * @throws ApiError
         */
        public static createInvoiceSurgery(
            id: string,
            requestBody?: Surgery,
        ): CancelablePromise<Surgery> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/surgery/surgery/{id}/create-invoice/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Funcionário.
         * @param requestBody
         * @returns Employee
         * @throws ApiError
         */
        public static activateEmployee(
            id: string,
            requestBody?: Employee,
        ): CancelablePromise<Employee> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/human_resources/employee/{id}/ativar/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Funcionário.
         * @param requestBody
         * @returns Employee
         * @throws ApiError
         */
        public static activateEnEmployee(
            id: string,
            requestBody?: Employee,
        ): CancelablePromise<Employee> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/human_resources/employee/{id}/activate/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Funcionário.
         * @param requestBody
         * @returns Employee
         * @throws ApiError
         */
        public static deactivateEmployee(
            id: string,
            requestBody?: Employee,
        ): CancelablePromise<Employee> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/human_resources/employee/{id}/desativar/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Funcionário.
         * @param requestBody
         * @returns Employee
         * @throws ApiError
         */
        public static deactivateEnEmployee(
            id: string,
            requestBody?: Employee,
        ): CancelablePromise<Employee> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/human_resources/employee/{id}/deactivate/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param requestBody
         * @returns AttendanceRecord
         * @throws ApiError
         */
        public static rollCallAttendanceRecord(
            requestBody?: AttendanceRecord,
        ): CancelablePromise<AttendanceRecord> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/education/attendance/roll_call/',
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param requestBody
         * @returns DisciplineScheduleItem
         * @throws ApiError
         */
        public static createFullPlanDisciplineScheduleItem(
            requestBody?: DisciplineScheduleItem,
        ): CancelablePromise<DisciplineScheduleItem> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/education/discipline_schedule/create_full_plan/',
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Item do Cronograma da Disciplina.
         * @param requestBody
         * @returns DisciplineScheduleItem
         * @throws ApiError
         */
        public static markCompletedDisciplineScheduleItem(
            id: string,
            requestBody?: DisciplineScheduleItem,
        ): CancelablePromise<DisciplineScheduleItem> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/education/discipline_schedule/{id}/mark_completed/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param requestBody
         * @returns RandomTest
         * @throws ApiError
         */
        public static scheduleForClassroomRandomTest(
            requestBody?: RandomTest,
        ): CancelablePromise<RandomTest> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/education/random_test/schedule_for_classroom/',
                body: requestBody,
                mediaType: 'application/json',
            });
        }
        /**
         * @param id A unique integer value identifying this Estado do Estudante no Cronograma.
         * @param requestBody
         * @returns DisciplineScheduleStudentStatus
         * @throws ApiError
         */
        public static markSuccessDisciplineScheduleStudentStatus(
            id: string,
            requestBody?: DisciplineScheduleStudentStatus,
        ): CancelablePromise<DisciplineScheduleStudentStatus> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/api/v1/education/schedule_progress/{id}/mark_success/',
                path: {
                    'id': id,
                },
                body: requestBody,
                mediaType: 'application/json',
            });
        }
    }
