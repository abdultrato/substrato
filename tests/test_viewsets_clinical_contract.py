import pytest


@pytest.mark.django_db
def test_clinical_viewsets_search_and_ordering_fields_are_valid():
    # Enterprise contract:
    # - viewsets must not include fields that do not exist in the ORM
    # - otherwise DRF SearchFilter/OrderingFilter can raise FieldError (500)
    from api.v1.clinical.viewsets import VIEWSET_MAP

    invalid = {}

    for key, viewset_cls in VIEWSET_MAP.items():
        bad_search = list(getattr(viewset_cls, "_invalid_search_fields", []) or [])
        bad_ordering = list(getattr(viewset_cls, "_invalid_ordering_fields", []) or [])
        if bad_search or bad_ordering:
            invalid[key] = {
                "search_fields": bad_search,
                "ordering_fields": bad_ordering,
            }

    assert invalid == {}


@pytest.mark.django_db
def test_clinical_viewsets_do_not_raise_on_search_or_invalid_ordering():
    from rest_framework.filters import OrderingFilter, SearchFilter
    from rest_framework.request import Request
    from rest_framework.test import APIRequestFactory

    from api.v1.clinical.viewsets import VIEWSET_MAP

    factory = APIRequestFactory()
    sf = SearchFilter()
    of = OrderingFilter()

    for _, viewset_cls in VIEWSET_MAP.items():
        view = viewset_cls()
        model = viewset_cls.queryset.model
        qs = model.objects.all()

        # Intentionally request ordering on invalid fields; should be ignored, never 500.
        dj_req = factory.get("/smoke", {"search": "x", "ordering": "description"})
        req = Request(dj_req)

        qs = sf.filter_queryset(req, qs, view)
        qs = of.filter_queryset(req, qs, view)
        list(qs[:1])


test_clinico_viewsets_search_and_ordering_fields_are_valid = (
    test_clinical_viewsets_search_and_ordering_fields_are_valid
)
test_clinico_viewsets_do_not_raise_on_search_or_invalid_ordering = (
    test_clinical_viewsets_do_not_raise_on_search_or_invalid_ordering
)
