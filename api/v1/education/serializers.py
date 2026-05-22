from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.education.models import (
    Assignment,
    AssignmentSubmission,
    AttendanceRecord,
    Classroom,
    Course,
    Enrollment,
    Examination,
    ExaminationAttempt,
    GradeRecord,
    LearningContent,
    RandomTest,
    Skill,
    StudentProfile,
    TeacherProfile,
)

_READ_ONLY_FIELDS = (
    "id",
    "custom_id",
    "tenant",
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
    "deleted",
    "deleted_at",
    "deleted_by",
    "version",
)


STUDENT_ALIASES = {
    "id_custom": "custom_id",
    "utilizador": "user",
    "usuario": "user",
    "usuário": "user",
    "conta": "user",
    "codigo": "student_code",
    "código": "student_code",
    "codigo_estudante": "student_code",
    "código_estudante": "student_code",
    "codigo_aluno": "student_code",
    "código_aluno": "student_code",
    "numero_estudante": "student_code",
    "número_estudante": "student_code",
    "data_nascimento": "birth_date",
    "nascimento": "birth_date",
    "encarregado": "guardian_name",
    "encarregado_nome": "guardian_name",
    "nome_encarregado": "guardian_name",
    "estado": "status",
    "situacao": "status",
    "situação": "status",
    "observacoes": "notes",
    "observações": "notes",
    "notas": "notes",
}

TEACHER_ALIASES = {
    "id_custom": "custom_id",
    "utilizador": "user",
    "usuario": "user",
    "usuário": "user",
    "conta": "user",
    "codigo": "teacher_code",
    "código": "teacher_code",
    "codigo_professor": "teacher_code",
    "código_professor": "teacher_code",
    "especialidade": "specialty",
    "area": "specialty",
    "área": "specialty",
    "disciplina": "specialty",
    "estado": "status",
    "situacao": "status",
    "situação": "status",
}

COURSE_ALIASES = {
    "id_custom": "custom_id",
    "nome": "name",
    "codigo": "code",
    "código": "code",
    "codigo_curso": "code",
    "código_curso": "code",
    "descricao": "description",
    "descrição": "description",
    "carga_horaria": "workload_hours",
    "carga_horária": "workload_hours",
    "horas": "workload_hours",
    "estado": "status",
    "situacao": "status",
    "situação": "status",
}

CLASSROOM_ALIASES = {
    "id_custom": "custom_id",
    "nome": "name",
    "turma": "name",
    "sala": "name",
    "curso": "course",
    "professor_titular": "homeroom_teacher",
    "director_turma": "homeroom_teacher",
    "diretor_turma": "homeroom_teacher",
    "ano_lectivo": "academic_year",
    "ano_letivo": "academic_year",
    "ano_academico": "academic_year",
    "ano_académico": "academic_year",
    "capacidade": "capacity",
}

ENROLLMENT_ALIASES = {
    "id_custom": "custom_id",
    "estudante": "student",
    "aluno": "student",
    "turma": "classroom",
    "sala": "classroom",
    "estado": "status",
    "situacao": "status",
    "situação": "status",
    "matriculado_em": "enrolled_on",
    "data_matricula": "enrolled_on",
    "data_matrícula": "enrolled_on",
    "encerrado_em": "closed_on",
    "data_encerramento": "closed_on",
}

ATTENDANCE_ALIASES = {
    "id_custom": "custom_id",
    "matricula": "enrollment",
    "matrícula": "enrollment",
    "inscricao": "enrollment",
    "inscrição": "enrollment",
    "data": "attendance_date",
    "data_presenca": "attendance_date",
    "data_presença": "attendance_date",
    "estado": "status",
    "situacao": "status",
    "situação": "status",
    "observacoes": "notes",
    "observações": "notes",
    "notas": "notes",
}

GRADE_ALIASES = {
    "id_custom": "custom_id",
    "matricula": "enrollment",
    "matrícula": "enrollment",
    "inscricao": "enrollment",
    "inscrição": "enrollment",
    "professor": "teacher",
    "componente": "component",
    "avaliacao": "component",
    "avaliação": "component",
    "disciplina": "component",
    "nota": "score",
    "pontuacao": "score",
    "pontuação": "score",
    "nota_maxima": "max_score",
    "nota_máxima": "max_score",
    "pontuacao_maxima": "max_score",
    "pontuação_máxima": "max_score",
    "peso": "weight",
    "publicado_em": "published_at",
    "data_publicacao": "published_at",
    "data_publicação": "published_at",
    "assessment": "component",
    "assessment_component": "component",
    "assessment_score": "score",
    "assessment_max_score": "max_score",
    "assessment_weight": "weight",
    "assessment_published_at": "published_at",
    "submissao": "assignment_submission",
    "submissão": "assignment_submission",
    "trabalho_submetido": "assignment_submission",
    "tentativa_exame": "examination_attempt",
    "attempt": "examination_attempt",
}

EXAMINATION_ALIASES = {
    "id_custom": "custom_id",
    "titulo": "title",
    "título": "title",
    "agendado_para": "scheduled_for",
    "marcado_para": "scheduled_for",
    "data_hora": "scheduled_for",
    "curso": "course",
    "turma": "classroom",
    "sala": "classroom",
    "nota_maxima": "max_score",
    "nota_máxima": "max_score",
    "pontuacao_maxima": "max_score",
    "pontuação_máxima": "max_score",
    "abre_em": "opens_at",
    "abre_ao": "opens_at",
    "fecha_em": "closes_at",
    "fecha_ao": "closes_at",
    "duracao_minutos": "duration_minutes",
    "duração_minutos": "duration_minutes",
    "tentativas_maximas": "max_attempts",
    "tentativas_máximas": "max_attempts",
    "estado": "status",
    "situacao": "status",
    "situação": "status",
    "publicado_em": "published_at",
    "data_publicacao": "published_at",
    "data_publicação": "published_at",
}

ASSIGNMENT_ALIASES = {
    "id_custom": "custom_id",
    "curso": "course",
    "turma": "classroom",
    "sala": "classroom",
    "professor": "teacher",
    "titulo": "title",
    "título": "title",
    "instrucoes": "instructions",
    "instruções": "instructions",
    "abre_em": "opens_at",
    "abre_ao": "opens_at",
    "prazo": "due_at",
    "prazo_final": "due_at",
    "prazo_limite": "due_at",
    "categoria_trabalho": "work_category",
    "tipo_trabalho": "work_category",
    "tipo": "work_category",
    "categoria": "work_category",
    "obrigatorio": "work_category",
    "obrigatório": "work_category",
    "higienico": "work_category",
    "higiénico": "work_category",
    "nota_maxima": "max_score",
    "nota_máxima": "max_score",
    "pontuacao_maxima": "max_score",
    "pontuação_máxima": "max_score",
    "estado": "status",
    "situacao": "status",
    "situação": "status",
    "permite_atraso": "allow_late_submission",
    "permite_submissao_atrasada": "allow_late_submission",
    "permite_submissão_atrasada": "allow_late_submission",
    "permite_multiplas_submissoes": "allow_multiple_submissions",
    "permite_múltiplas_submissões": "allow_multiple_submissions",
    "max_submissoes": "max_submissions",
    "max_submissões": "max_submissions",
    "publicado_em": "published_at",
    "data_publicacao": "published_at",
    "data_publicação": "published_at",
}

ASSIGNMENT_SUBMISSION_ALIASES = {
    "id_custom": "custom_id",
    "trabalho": "assignment",
    "tarefa": "assignment",
    "assignment_id": "assignment",
    "matricula": "enrollment",
    "matrícula": "enrollment",
    "inscricao": "enrollment",
    "inscrição": "enrollment",
    "estudante": "student",
    "aluno": "student",
    "tentativa": "attempt_number",
    "numero_tentativa": "attempt_number",
    "número_tentativa": "attempt_number",
    "submetido_em": "submitted_at",
    "data_submissao": "submitted_at",
    "data_submissão": "submitted_at",
    "estado": "status",
    "situacao": "status",
    "situação": "status",
    "resposta": "content_text",
    "conteudo": "content_text",
    "conteúdo": "content_text",
    "url_anexo": "attachment_url",
    "anexo_url": "attachment_url",
    "nota": "score",
    "pontuacao": "score",
    "pontuação": "score",
    "nota_maxima_snapshot": "max_score_snapshot",
    "nota_máxima_snapshot": "max_score_snapshot",
    "feedback_professor": "teacher_feedback",
    "comentario_professor": "teacher_feedback",
    "comentário_professor": "teacher_feedback",
    "avaliado_por": "graded_by",
    "avaliado_em": "graded_at",
}

EXAM_ATTEMPT_ALIASES = {
    "id_custom": "custom_id",
    "exame": "examination",
    "prova": "examination",
    "matricula": "enrollment",
    "matrícula": "enrollment",
    "inscricao": "enrollment",
    "inscrição": "enrollment",
    "estudante": "student",
    "aluno": "student",
    "estado": "status",
    "situacao": "status",
    "situação": "status",
    "iniciado_em": "started_at",
    "data_inicio": "started_at",
    "data_início": "started_at",
    "expira_em": "expires_at",
    "data_expiracao": "expires_at",
    "data_expiração": "expires_at",
    "submetido_em": "submitted_at",
    "data_submissao": "submitted_at",
    "data_submissão": "submitted_at",
    "tempo_limite_minutos": "time_limit_minutes_snapshot",
    "tempo_limite": "time_limit_minutes_snapshot",
    "nota_maxima_snapshot": "max_score_snapshot",
    "nota_máxima_snapshot": "max_score_snapshot",
    "resposta": "submission_payload",
    "conteudo_resposta": "submission_payload",
    "conteúdo_resposta": "submission_payload",
    "nota": "score",
    "pontuacao": "score",
    "pontuação": "score",
    "feedback_professor": "teacher_feedback",
    "avaliado_por": "graded_by",
    "avaliado_em": "graded_at",
}

CONTENT_ALIASES = {
    "id_custom": "custom_id",
    "titulo": "title",
    "título": "title",
    "tipo": "content_type",
    "tipo_conteudo": "content_type",
    "tipo_conteúdo": "content_type",
    "corpo": "body",
    "texto": "body",
    "ficheiro_url": "file_url",
    "arquivo_url": "file_url",
    "url_ficheiro": "file_url",
    "url_arquivo": "file_url",
    "url_externa": "external_url",
    "link_externo": "external_url",
    "publicado": "published",
    "curso": "course",
    "autor": "author",
    "professor": "author",
    "lesson_title": "title",
    "lesson_type": "content_type",
    "lesson_body": "body",
    "lesson_file_url": "file_url",
    "lesson_external_url": "external_url",
    "lesson_published": "published",
    "lesson_course": "course",
    "lesson_author": "author",
}

SKILL_ALIASES = {
    "id_custom": "custom_id",
    "codigo": "code",
    "código": "code",
    "codigo_skill": "code",
    "código_skill": "code",
    "nome_skill": "name",
    "habilidade": "name",
    "descricao": "description",
    "descrição": "description",
    "curso": "course",
    "categoria": "category",
    "nivel": "level",
    "nível": "level",
    "estado": "status",
    "situacao": "status",
    "situação": "status",
}

RANDOM_TEST_ALIASES = {
    "id_custom": "custom_id",
    "curso": "course",
    "turma": "classroom",
    "sala": "classroom",
    "matricula": "enrollment",
    "matrícula": "enrollment",
    "inscricao": "enrollment",
    "inscrição": "enrollment",
    "estudante": "student",
    "aluno": "student",
    "professor": "teacher",
    "titulo": "title",
    "título": "title",
    "agendado_para": "scheduled_for",
    "marcado_para": "scheduled_for",
    "abre_em": "opens_at",
    "abre_ao": "opens_at",
    "fecha_em": "closes_at",
    "fecha_ao": "closes_at",
    "duracao_minutos": "duration_minutes",
    "duração_minutos": "duration_minutes",
    "quantidade_questoes": "question_count",
    "quantidade_questões": "question_count",
    "semente_aleatoria": "random_seed",
    "semente_aleatória": "random_seed",
    "estado": "status",
    "situacao": "status",
    "situação": "status",
    "observacoes": "notes",
    "observações": "notes",
}


class FullCleanSerializerMixin:
    """
    Force model-level validation before writing to the database.
    """

    def create(self, validated_data):
        model = self.Meta.model(**validated_data)
        model.full_clean()
        model.save()
        return model

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.full_clean()
        instance.save()
        return instance


class StudentProfileSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = STUDENT_ALIASES
    legacy_output_aliases = STUDENT_ALIASES

    class Meta:
        model = StudentProfile
        fields = "__all__"
        read_only_fields = _READ_ONLY_FIELDS


class TeacherProfileSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = TEACHER_ALIASES
    legacy_output_aliases = TEACHER_ALIASES

    class Meta:
        model = TeacherProfile
        fields = "__all__"
        read_only_fields = _READ_ONLY_FIELDS


class CourseSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = COURSE_ALIASES
    legacy_output_aliases = COURSE_ALIASES

    class Meta:
        model = Course
        fields = "__all__"
        read_only_fields = _READ_ONLY_FIELDS


class ClassroomSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = CLASSROOM_ALIASES
    legacy_output_aliases = CLASSROOM_ALIASES

    class Meta:
        model = Classroom
        fields = "__all__"
        read_only_fields = _READ_ONLY_FIELDS


class EnrollmentSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = ENROLLMENT_ALIASES
    legacy_output_aliases = ENROLLMENT_ALIASES

    class Meta:
        model = Enrollment
        fields = "__all__"
        read_only_fields = _READ_ONLY_FIELDS


class AttendanceRecordSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = ATTENDANCE_ALIASES
    legacy_output_aliases = ATTENDANCE_ALIASES

    class Meta:
        model = AttendanceRecord
        fields = "__all__"
        read_only_fields = _READ_ONLY_FIELDS


class GradeRecordSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = GRADE_ALIASES
    legacy_output_aliases = GRADE_ALIASES

    class Meta:
        model = GradeRecord
        fields = "__all__"
        read_only_fields = _READ_ONLY_FIELDS


class AssignmentSerializer(LegacyAliasSerializerMixin, FullCleanSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = ASSIGNMENT_ALIASES
    legacy_output_aliases = ASSIGNMENT_ALIASES

    class Meta:
        model = Assignment
        fields = "__all__"
        read_only_fields = _READ_ONLY_FIELDS


class AssignmentSubmissionSerializer(LegacyAliasSerializerMixin, FullCleanSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = ASSIGNMENT_SUBMISSION_ALIASES
    legacy_output_aliases = ASSIGNMENT_SUBMISSION_ALIASES

    def validate(self, attrs):
        assignment = attrs.get("assignment") or getattr(self.instance, "assignment", None)
        student = attrs.get("student") or getattr(self.instance, "student", None)
        tenant = (
            attrs.get("tenant")
            or getattr(self.instance, "tenant", None)
            or getattr(getattr(self.context.get("request"), "tenant", None), "id", None)
        )

        if attrs.get("submitted_at") is None and not getattr(self.instance, "submitted_at", None):
            attrs["submitted_at"] = timezone.now()

        if assignment and attrs.get("max_score_snapshot") is None and not getattr(self.instance, "max_score_snapshot", None):
            attrs["max_score_snapshot"] = assignment.max_score

        if self.instance is None and assignment and student:
            existing_qs = AssignmentSubmission.all_objects.filter(assignment=assignment, student=student)
            if tenant:
                existing_qs = existing_qs.filter(tenant=tenant)
            if attrs.get("attempt_number") in (None, 0):
                attrs["attempt_number"] = existing_qs.count() + 1

        return attrs

    class Meta:
        model = AssignmentSubmission
        fields = "__all__"
        read_only_fields = _READ_ONLY_FIELDS


class ExaminationSerializer(LegacyAliasSerializerMixin, FullCleanSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = EXAMINATION_ALIASES
    legacy_output_aliases = EXAMINATION_ALIASES

    class Meta:
        model = Examination
        fields = "__all__"
        read_only_fields = _READ_ONLY_FIELDS


class ExaminationAttemptSerializer(LegacyAliasSerializerMixin, FullCleanSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = EXAM_ATTEMPT_ALIASES
    legacy_output_aliases = EXAM_ATTEMPT_ALIASES

    def validate(self, attrs):
        exam = attrs.get("examination") or getattr(self.instance, "examination", None)
        started_at = attrs.get("started_at") or getattr(self.instance, "started_at", None) or timezone.now()
        attrs["started_at"] = started_at

        time_limit = attrs.get("time_limit_minutes_snapshot") or getattr(self.instance, "time_limit_minutes_snapshot", None)
        if time_limit is None and exam is not None:
            time_limit = exam.duration_minutes
            attrs["time_limit_minutes_snapshot"] = time_limit

        if attrs.get("max_score_snapshot") is None and getattr(self.instance, "max_score_snapshot", None) is None and exam is not None:
            attrs["max_score_snapshot"] = exam.max_score

        if attrs.get("expires_at") is None and getattr(self.instance, "expires_at", None) is None and time_limit is not None:
            expires_at = started_at + timedelta(minutes=int(time_limit))
            if exam and exam.closes_at and expires_at > exam.closes_at:
                expires_at = exam.closes_at
            attrs["expires_at"] = expires_at

        if attrs.get("status") == ExaminationAttempt.Status.SUBMITTED and attrs.get("submitted_at") is None:
            attrs["submitted_at"] = timezone.now()

        return attrs

    class Meta:
        model = ExaminationAttempt
        fields = "__all__"
        read_only_fields = _READ_ONLY_FIELDS
        extra_kwargs = {
            "expires_at": {"required": False},
            "started_at": {"required": False},
            "submitted_at": {"required": False},
            "time_limit_minutes_snapshot": {"required": False},
            "max_score_snapshot": {"required": False},
        }


class LearningContentSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = CONTENT_ALIASES
    legacy_output_aliases = CONTENT_ALIASES

    class Meta:
        model = LearningContent
        fields = "__all__"
        read_only_fields = _READ_ONLY_FIELDS


class SkillSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = SKILL_ALIASES
    legacy_output_aliases = SKILL_ALIASES

    class Meta:
        model = Skill
        fields = "__all__"
        read_only_fields = _READ_ONLY_FIELDS


class RandomTestSerializer(LegacyAliasSerializerMixin, FullCleanSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = RANDOM_TEST_ALIASES
    legacy_output_aliases = RANDOM_TEST_ALIASES

    class Meta:
        model = RandomTest
        fields = "__all__"
        read_only_fields = _READ_ONLY_FIELDS


class RandomTestClassroomScheduleSerializer(serializers.Serializer):
    classroom = serializers.PrimaryKeyRelatedField(queryset=Classroom.objects.all())
    course = serializers.PrimaryKeyRelatedField(queryset=Course.objects.all(), required=False)
    teacher = serializers.PrimaryKeyRelatedField(
        queryset=TeacherProfile.objects.all(),
        required=False,
        allow_null=True,
    )
    scheduled_for = serializers.DateTimeField()
    opens_at = serializers.DateTimeField(required=False)
    closes_at = serializers.DateTimeField(required=False, allow_null=True)
    duration_minutes = serializers.IntegerField(min_value=1, default=45)
    question_count = serializers.IntegerField(min_value=1, default=15)
    title_template = serializers.CharField(max_length=180, default="Teste Aleatório - {student_code}")
    student_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=False,
    )
    only_active_enrollments = serializers.BooleanField(default=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        request = self.context.get("request")
        tenant = getattr(request, "tenant", None)
        classroom = attrs["classroom"]
        course = attrs.get("course") or classroom.course
        teacher = attrs.get("teacher")

        if tenant is not None:
            tenant_id = getattr(tenant, "id", None)
            if tenant_id and classroom.tenant_id != tenant_id:
                raise serializers.ValidationError({"classroom": "Classroom must belong to the authenticated tenant."})
            if tenant_id and course.tenant_id != tenant_id:
                raise serializers.ValidationError({"course": "Course must belong to the authenticated tenant."})
            if teacher is not None and tenant_id and teacher.tenant_id != tenant_id:
                raise serializers.ValidationError({"teacher": "Teacher must belong to the authenticated tenant."})

        if classroom.course_id != course.id:
            raise serializers.ValidationError({"course": "Course must match classroom course."})

        opens_at = attrs.get("opens_at") or attrs["scheduled_for"]
        closes_at = attrs.get("closes_at")
        if closes_at and closes_at <= opens_at:
            raise serializers.ValidationError({"closes_at": "Close time must be after opens_at."})

        student_ids = attrs.get("student_ids") or []
        if student_ids:
            attrs["student_ids"] = list(dict.fromkeys(student_ids))

        attrs["course"] = course
        attrs["opens_at"] = opens_at
        attrs["scheduled_for"] = opens_at
        return attrs
