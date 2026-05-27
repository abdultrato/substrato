from drf_spectacular.generators import ensure_unique_operation_ids


def test_openapi_operation_ids_are_made_path_aware_for_aliases():
    schema = {
        "paths": {
            "/api/v1/education/grade/": {"get": {"operationId": "listGradeRecords"}},
            "/api/v1/education/assessment/": {"get": {"operationId": "listGradeRecords"}},
            "/api/v1/identity/user/{id}/": {"patch": {"operationId": "partialUpdateUser"}},
            "/api/v1/auth/user/": {"patch": {"operationId": "partialUpdateUser"}},
        }
    }

    ensure_unique_operation_ids(schema)

    operation_ids = [
        operation["operationId"]
        for path_item in schema["paths"].values()
        for operation in path_item.values()
    ]

    assert operation_ids == [
        "listEducationGrade",
        "listEducationAssessment",
        "partialUpdateIdentityUserById",
        "partialUpdateAuthUser",
    ]
    assert len(operation_ids) == len(set(operation_ids))
