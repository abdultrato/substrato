#!/usr/bin/env python
"""Simple test runner to check if tests work."""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'plataforma.settings.development')
django.setup()

# Now import and run the test
from apps.ai_assistant.services.cache import MemoryCacheBackend

# Test 1: Basic set/get
print("Test 1: Basic set/get", end="... ")
backend = MemoryCacheBackend(max_size=3)
backend.set("key1", "value1")
result = backend.get("key1")
assert result == "value1", f"Expected 'value1', got {result}"
print("PASS")

# Test 2: Get missing key
print("Test 2: Get missing key", end="... ")
result = backend.get("missing")
assert result is None, f"Expected None, got {result}"
print("PASS")

# Test 3: Delete
print("Test 3: Delete", end="... ")
backend.set("key2", "value2")
deleted = backend.delete("key2")
assert deleted == True, f"Expected True, got {deleted}"
assert backend.get("key2") is None, "Expected None after delete"
print("PASS")

# Test 4: Clear
print("Test 4: Clear", end="... ")
backend.set("key3", "value3")
backend.set("key4", "value4")
cleared = backend.clear()
assert cleared == True, f"Expected True, got {cleared}"
assert backend.get("key3") is None and backend.get("key4") is None
print("PASS")

# Test 5: FIFO eviction
print("Test 5: FIFO eviction", end="... ")
backend2 = MemoryCacheBackend(max_size=3)
backend2.set("key1", "value1")
backend2.set("key2", "value2")
backend2.set("key3", "value3")
assert len(backend2._cache) == 3
backend2.set("key4", "value4")
assert backend2.get("key1") is None, "Expected first key to be evicted"
assert backend2.get("key4") is not None, "Expected new key to be present"
print("PASS")

# Test 6: Rate limiter
print("Test 6: Rate limiter", end="... ")
from apps.ai_assistant.services.rate_limiter import SlidingWindowBackend, RateLimitConfig

config = RateLimitConfig(limit=2, window_seconds=1)
backend3 = SlidingWindowBackend(config)
assert backend3.is_allowed("test_key") == True
assert backend3.is_allowed("test_key") == True
try:
    backend3.is_allowed("test_key", raise_if_limited=True)
    assert False, "Expected exception"
except Exception as e:
    assert "RateLimitExceeded" in str(type(e).__name__)
print("PASS")

print("\nAll tests passed!")
