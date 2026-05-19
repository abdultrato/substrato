from rest_framework import serializers

from apps.education.models import (
    AttendanceRecord,
    Classroom,
    Course,
    Enrollment,
    Examination,
    GradeRecord,
    LearningContent,
    StudentProfile,
    TeacherProfile,
)


_READ_ONLY_FIELDS = (
    "custom_id",
    "tenant",
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
    "deleted",
    "deleted_at",
    "deleted_by",
)


class StudentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        fields = "__all__"
        read_only_fields = _READ_ONLY_FIELDS


class TeacherProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherProfile
        fields = "__all__"
        read_only_fields = _READ_ONLY_FIELDS


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = "__all__"
        read_only_fields = _READ_ONLY_FIELDS


class ClassroomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Classroom
        fields = "__all__"
        read_only_fields = _READ_ONLY_FIELDS


class EnrollmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Enrollment
        fields = "__all__"
        read_only_fields = _READ_ONLY_FIELDS


class AttendanceRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceRecord
        fields = "__all__"
        read_only_fields = _READ_ONLY_FIELDS


class GradeRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = GradeRecord
        fields = "__all__"
        read_only_fields = _READ_ONLY_FIELDS


class ExaminationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Examination
        fields = "__all__"
        read_only_fields = _READ_ONLY_FIELDS


class LearningContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningContent
        fields = "__all__"
        read_only_fields = _READ_ONLY_FIELDS
