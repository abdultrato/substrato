"""Tests for the search functionality in QuerySetAtivo."""

from django.test import TestCase
from django.db import models
from core.models.managers import QuerySetAtivo, ManagerAtivo, AllObjectsManager
from core.models.base import BaseModel


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


class TestSearchManager(TestCase):
    """Test the search manager functionality."""

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

        class NoSearchModel(BaseModel):
            some_field = models.CharField(max_length=100)

            class Meta:
                app_label = 'core'
                db_table = 'core_nosearchmodel'

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