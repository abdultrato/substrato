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


@pytest.mark.django_db
def test_clinical_labrequest_list_does_not_raise_serializer_binding_error():
    from django.contrib.auth import get_user_model
    from rest_framework.test import APIClient

    from apps.tenants.models.tenant import Tenant

    tenant = Tenant.objects.filter(active=True).order_by("id").first()
    if tenant is None:
        tenant = Tenant.objects.create(
            name="Tenant Contract",
            identifier="tenant-contract",
            domain="localhost",
            active=True,
            commercial_status=Tenant.CommercialStatus.TRIAL,
        )
    elif not tenant.domain:
        tenant.domain = "localhost"
        tenant.save(update_fields=["domain"])

    User = get_user_model()
    user = User.objects.create_user(
        username="clinical_contract_admin",
        password="x",
        is_superuser=True,
        is_staff=True,
        is_active=True,
        tenant=tenant,
    )

    client = APIClient(HTTP_HOST="localhost")
    client.force_authenticate(user=user)

    response = client.get("/api/v1/clinical/labrequest/")
    assert response.status_code == 200

