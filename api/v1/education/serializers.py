from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.education.models import (
    AttendanceRecord,
    Classroom,
    Course,
    Enrollment,
    Examination,
    GradeRecord,
    LearningContent,
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


class ExaminationSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = EXAMINATION_ALIASES
    legacy_output_aliases = EXAMINATION_ALIASES

    class Meta:
        model = Examination
        fields = "__all__"
        read_only_fields = _READ_ONLY_FIELDS


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
