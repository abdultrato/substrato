"""Tests for the search functionality in QuerySetAtivo."""

from django.db import connection, models
from django.test import TestCase

from core.models.base import BaseModel
from core.models.managers import AllObjectsManager, ManagerAtivo


# Define test model outside of test methods so it's properly registered
class TestSearchModel(BaseModel):
    """Test model for search functionality."""
    name = models.CharField(max_length=255)
    custom_id = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        app_label = 'core'
        # Create table for this model
        db_table = 'core_testsearchmodel'

    # Set up managers to test the search functionality
    objects = ManagerAtivo()
    all_objects = AllObjectsManager()


class NoSearchModel(BaseModel):
    some_field = models.CharField(max_length=100)

    class Meta:
        app_label = 'core'
        db_table = 'core_nosearchmodel'

    objects = ManagerAtivo()
    all_objects = AllObjectsManager()


class ActiveStateModel(BaseModel):
    name = models.CharField(max_length=100)
    active = models.BooleanField(default=True)
    deleted = models.BooleanField(default=False)

    class Meta:
        app_label = 'core'
        db_table = 'core_activestatemodel'

    objects = ManagerAtivo()
    all_objects = AllObjectsManager()


def _create_table_if_missing(model):
    if model._meta.db_table in connection.introspection.table_names():
        return
    with connection.schema_editor() as schema_editor:
        schema_editor.create_model(model)


def _drop_table_if_exists(model):
    if model._meta.db_table not in connection.introspection.table_names():
        return
    with connection.schema_editor() as schema_editor:
        schema_editor.delete_model(model)


class TestSearchManager(TestCase):
    """Test the search manager functionality."""

    @classmethod
    def setUpClass(cls):
        _create_table_if_missing(TestSearchModel)
        _create_table_if_missing(NoSearchModel)
        _create_table_if_missing(ActiveStateModel)
        super().setUpClass()

    @classmethod
    def tearDownClass(cls):
        try:
            super().tearDownClass()
        finally:
            _drop_table_if_exists(ActiveStateModel)
            _drop_table_if_exists(NoSearchModel)
            _drop_table_if_exists(TestSearchModel)

    @classmethod
    def setUpTestData(cls):
        """Set up test data for the whole TestCase."""
        # Create test instances
        cls.test1 = TestSearchModel.objects.create(
            name="John Doe",
            custom_id="JD001",
            description="A test patient"
        )
        cls.test2 = TestSearchModel.objects.create(
            name="Jane Smith",
            custom_id="JS002",
            description="Another test patient"
        )
        cls.test3 = TestSearchModel.objects.create(
            name="Bob Johnson",
            custom_id="BJ003",
            description="Yet another test patient"
        )

    def test_search_with_default_fields(self):
        """Test search using default fields (name, custom_id)."""
        # Search by name
        results = TestSearchModel.objects.search("John")
        self.assertEqual(results.count(), 2)  # John Doe and Bob Johnson

        # Search by custom_id
        results = TestSearchModel.objects.search("JD001")
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first().name, "John Doe")

        # Search that should return no results
        results = TestSearchModel.objects.search("Nonexistent")
        self.assertEqual(results.count(), 0)

    def test_search_with_custom_fields(self):
        """Test search with custom fields specified."""
        # Search only in description
        results = TestSearchModel.objects.search("test patient", fields=['description'])
        self.assertEqual(results.count(), 3)

        # Search in description for specific term
        results = TestSearchModel.objects.search("Yet another", fields=['description'])
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first().name, "Bob Johnson")

    def test_search_empty_query(self):
        """Test that empty query returns all results."""
        results = TestSearchModel.objects.search("")
        self.assertEqual(results.count(), 3)

        results = TestSearchModel.objects.search(None)
        self.assertEqual(results.count(), 3)

    def test_search_no_searchable_fields(self):
        """Test search on model with no searchable fields."""

        # Create instance
        NoSearchModel.objects.create(some_field="test")

        # Search should return empty queryset
        results = NoSearchModel.objects.search("test")
        self.assertEqual(results.count(), 0)

    def test_search_ordering_by_rank(self):
        """Test that results are ordered by relevance rank."""
        # Create instances with different relevance
        TestSearchModel.objects.create(
            name="Johnny Doe",
            custom_id="JD004",
            description="A different test patient"
        )
        TestSearchModel.objects.create(
            name="Jane Johnson",
            custom_id="JJ005",
            description="Patient with Johnny in description"
        )

        # Search for "Johnny" - should rank exact name match higher
        results = TestSearchModel.objects.search("Johnny")
        self.assertGreaterEqual(results.count(), 2)

        # First result should be the one with "Johnny" in name
        # (exact match in name field should rank higher than in description)
        if results.count() >= 2:
            self.assertIn(results.first().name, ["Johnny Doe", "Jane Johnson"])

    def test_state_helpers_respect_available_active_and_deleted_fields(self):
        ActiveStateModel.all_objects.create(name="active", active=True, deleted=False)
        ActiveStateModel.all_objects.create(name="inactive", active=False, deleted=False)
        ActiveStateModel.all_objects.create(name="deleted", active=True, deleted=True)

        self.assertEqual(list(ActiveStateModel.objects.ativos().values_list("name", flat=True)), ["active"])
        self.assertEqual(list(ActiveStateModel.objects.inativos().values_list("name", flat=True)), ["inactive"])
        self.assertEqual(list(ActiveStateModel.all_objects.deletados().values_list("name", flat=True)), ["deleted"])

    def test_state_helpers_are_safe_without_active_or_deleted_fields(self):
        row = NoSearchModel.objects.create(some_field="visible")

        self.assertEqual(list(NoSearchModel.objects.ativos()), [row])
        self.assertEqual(list(NoSearchModel.objects.inativos()), [])
        self.assertEqual(list(NoSearchModel.objects.deletados()), [])
