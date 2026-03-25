import pytest


@pytest.mark.django_db
def test_all_viewsets_have_validated_search_and_ordering_fields():
    from api.v1.routing.rotas import VIEWSET_GROUPS
    from api.v1.viewset_mixins import ValidatedSearchOrderingMixin

    invalid = {}
    missing_mixin = []

    for group_name, viewset_map in VIEWSET_GROUPS.items():
        for key, viewset_cls in viewset_map.items():
            if not issubclass(viewset_cls, ValidatedSearchOrderingMixin):
                missing_mixin.append(f"{group_name}.{key}:{viewset_cls.__module__}.{viewset_cls.__name__}")
                continue

            bad_search = list(getattr(viewset_cls, "_invalid_search_fields", []) or [])
            bad_ordering = list(getattr(viewset_cls, "_invalid_ordering_fields", []) or [])
            if bad_search or bad_ordering:
                invalid[f"{group_name}.{key}"] = {
                    "search_fields": bad_search,
                    "ordering_fields": bad_ordering,
                }

    assert missing_mixin == []
    assert invalid == {}


@pytest.mark.django_db
def test_all_model_viewsets_do_not_raise_on_search_or_invalid_ordering():
    from rest_framework.filters import OrderingFilter, SearchFilter
    from rest_framework.request import Request
    from rest_framework.test import APIRequestFactory

    from api.v1.routing.rotas import VIEWSET_GROUPS

    factory = APIRequestFactory()
    sf = SearchFilter()
    of = OrderingFilter()

    for _, viewset_map in VIEWSET_GROUPS.items():
        for _, viewset_cls in viewset_map.items():
            qs = getattr(viewset_cls, "queryset", None)
            model = getattr(qs, "model", None)
            if model is None:
                continue

            view = viewset_cls()
            base_qs = model.objects.all()

            # Request ordering on invalid fields; should be ignored, never 500.
            dj_req = factory.get("/smoke", {"search": "x", "ordering": "description"})
            req = Request(dj_req)

            filtered = sf.filter_queryset(req, base_qs, view)
            filtered = of.filter_queryset(req, filtered, view)
            list(filtered[:1])
