export * from "./entidade"
export * from "./exam"
export * from "./invoice"
export * from "./patient"
export * from "./request"

export type EntityList = import("./entidade").Entity
export type ExamList = import("./exam").Exam
export type InvoiceList = import("./invoice").InvoiceSummary
export type PatientList = import("./patient").Patient
export type RequestList = import("./request").Request
