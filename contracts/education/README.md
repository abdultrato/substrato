# Education contracts

This folder stores contracts consumed by other bounded contexts without importing
Education models directly.

Current scope:
- event payload contracts for StudentCreated, EnrollmentCompleted, GradePublished,
  ExamScheduled, LessonUploaded
- request/response expectations for internal integration APIs

Governance rules:
- no direct cross-domain ORM imports
- transport contracts are versioned
- backward compatibility is mandatory for integration consumers
