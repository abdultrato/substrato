"""Error handling and retry logic for AI operations."""

from __future__ import annotations

import logging
import random
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from functools import wraps
from typing import Any, Callable, Generic, Optional, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


class ErrorSeverity(str, Enum):
    """Error severity levels."""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class CircuitState(str, Enum):
    """Circuit breaker states."""

    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if recovered


@dataclass(frozen=True)
class RetryConfig:
    """Retry configuration."""

    max_attempts: int = 3
    initial_delay: float = 1.0  # seconds
    max_delay: float = 60.0  # seconds
    exponential_base: float = 2.0
    jitter: bool = True
    retryable_exceptions: tuple[type[Exception], ...] = (
        TimeoutError,
        ConnectionError,
        OSError,
    )


@dataclass(frozen=True)
class CircuitBreakerConfig:
    """Circuit breaker configuration."""

    failure_threshold: int = 5  # failures before opening
    recovery_timeout: int = 60  # seconds before half-open
    success_threshold: int = 2  # successes to close circuit
    window_size: int = 100  # track last N operations


class AiException(Exception):
    """Base exception for AI operations."""

    def __init__(
        self,
        message: str,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        error_code: Optional[str] = None,
        original_exception: Optional[Exception] = None,
    ):
        self.message = message
        self.severity = severity
        self.error_code = error_code or self.__class__.__name__
        self.original_exception = original_exception
        super().__init__(message)


class ToolExecutionError(AiException):
    """Error executing a tool."""

    pass


class PolicyViolationError(AiException):
    """Policy violation detected."""

    pass


class InvestigationError(AiException):
    """Error during investigation."""

    pass


class CircuitBreaker:
    """Circuit breaker to prevent cascading failures."""

    def __init__(self, config: CircuitBreakerConfig) -> None:
        self.config = config
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: float | None = None
        self._operation_history: list[bool] = []

    def call(self, func: Callable[..., T], *args, **kwargs) -> T:
        """Execute function through circuit breaker."""
        if self.state == CircuitState.OPEN:
            if self._should_attempt_recovery():
                self.state = CircuitState.HALF_OPEN
                logger.info("Circuit breaker transitioning to HALF_OPEN")
            else:
                raise AiException(
                    "Circuit breaker is OPEN - service temporarily unavailable",
                    severity=ErrorSeverity.HIGH,
                    error_code="circuit_breaker_open",
                )

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise

    def _on_success(self) -> None:
        """Handle successful operation."""
        self._operation_history.append(True)
        self.failure_count = 0

        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.config.success_threshold:
                self.state = CircuitState.CLOSED
                self.success_count = 0
                logger.info("Circuit breaker CLOSED - service recovered")

        self._trim_history()

    def _on_failure(self) -> None:
        """Handle failed operation."""
        self._operation_history.append(False)
        self.failure_count += 1
        self.last_failure_time = time.time()

        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.OPEN
            logger.warning("Circuit breaker returned to OPEN after failed recovery attempt")
        elif self.failure_count >= self.config.failure_threshold:
            self.state = CircuitState.OPEN
            logger.warning(f"Circuit breaker OPEN after {self.failure_count} failures")

        self._trim_history()

    def _should_attempt_recovery(self) -> bool:
        """Check if enough time passed to attempt recovery."""
        if self.last_failure_time is None:
            return True
        return time.time() - self.last_failure_time >= self.config.recovery_timeout

    def _trim_history(self) -> None:
        """Keep history within window size."""
        if len(self._operation_history) > self.config.window_size:
            self._operation_history = self._operation_history[-self.config.window_size :]

    def get_stats(self) -> dict[str, Any]:
        """Get circuit breaker statistics."""
        return {
            "state": self.state.value,
            "failure_count": self.failure_count,
            "success_count": self.success_count,
            "last_failure_time": self.last_failure_time,
            "success_rate": self._calculate_success_rate(),
        }

    def _calculate_success_rate(self) -> str:
        """Calculate success rate from history."""
        if not self._operation_history:
            return "0%"
        successes = sum(self._operation_history)
        rate = (successes / len(self._operation_history)) * 100
        return f"{rate:.1f}%"


class RetryStrategy(ABC):
    """Abstract retry strategy."""

    @abstractmethod
    def get_delay(self, attempt: int) -> float:
        """Get delay before retry attempt."""
        pass


class ExponentialBackoffStrategy(RetryStrategy):
    """Exponential backoff retry strategy."""

    def __init__(self, config: RetryConfig) -> None:
        self.config = config

    def get_delay(self, attempt: int) -> float:
        """Calculate exponential backoff delay."""
        delay = self.config.initial_delay * (self.config.exponential_base ** (attempt - 1))
        delay = min(delay, self.config.max_delay)

        if self.config.jitter:
            # Add random jitter (±10%)
            jitter = delay * 0.1 * random.random()
            delay += jitter if random.random() > 0.5 else -jitter

        return delay


class Retryable:
    """Manages retries for operations."""

    def __init__(self, config: RetryConfig) -> None:
        self.config = config
        self.strategy = ExponentialBackoffStrategy(config)
        self._operation_attempts: dict[str, int] = {}

    def execute(
        self,
        func: Callable[..., T],
        *args,
        operation_name: str = "",
        **kwargs,
    ) -> T:
        """Execute function with retry logic."""
        operation_name = operation_name or func.__name__
        self._operation_attempts[operation_name] = 0

        for attempt in range(1, self.config.max_attempts + 1):
            try:
                self._operation_attempts[operation_name] = attempt
                result = func(*args, **kwargs)
                if attempt > 1:
                    logger.info(f"Operation '{operation_name}' succeeded on attempt {attempt}")
                return result

            except Exception as e:
                is_retryable = isinstance(e, self.config.retryable_exceptions)

                if not is_retryable or attempt >= self.config.max_attempts:
                    logger.error(
                        f"Operation '{operation_name}' failed after {attempt} attempt(s): {e}",
                        exc_info=True,
                    )
                    raise AiException(
                        f"Operation failed: {operation_name}",
                        severity=ErrorSeverity.HIGH,
                        error_code="operation_failed",
                        original_exception=e,
                    )

                delay = self.strategy.get_delay(attempt)
                logger.warning(
                    f"Operation '{operation_name}' attempt {attempt} failed, "
                    f"retrying in {delay:.2f}s: {e}"
                )
                time.sleep(delay)

        raise AiException(
            f"Operation '{operation_name}' exhausted all retry attempts",
            severity=ErrorSeverity.HIGH,
        )

    def get_attempt_stats(self) -> dict[str, int]:
        """Get attempt statistics."""
        return self._operation_attempts.copy()


# Global instances
default_retry_config = RetryConfig()
default_circuit_breaker_config = CircuitBreakerConfig()


def retry(
    config: Optional[RetryConfig] = None,
    circuit_breaker_config: Optional[CircuitBreakerConfig] = None,
) -> Callable:
    """Decorator for automatic retry and circuit breaker."""

    retry_config = config or default_retry_config
    cb_config = circuit_breaker_config or default_circuit_breaker_config

    def decorator(func: Callable) -> Callable:
        retryable = Retryable(retry_config)
        circuit_breaker = CircuitBreaker(cb_config)

        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            return circuit_breaker.call(
                lambda: retryable.execute(
                    func,
                    *args,
                    operation_name=func.__name__,
                    **kwargs,
                )
            )

        # Attach metadata
        wrapper._retryable = retryable  # type: ignore
        wrapper._circuit_breaker = circuit_breaker  # type: ignore

        return wrapper

    return decorator


def async_retry(
    config: Optional[RetryConfig] = None,
    circuit_breaker_config: Optional[CircuitBreakerConfig] = None,
) -> Callable:
    """Decorator for automatic retry on async functions."""

    retry_config = config or default_retry_config

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            for attempt in range(1, retry_config.max_attempts + 1):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    is_retryable = isinstance(e, retry_config.retryable_exceptions)

                    if not is_retryable or attempt >= retry_config.max_attempts:
                        raise AiException(
                            f"Async operation failed: {func.__name__}",
                            severity=ErrorSeverity.HIGH,
                            original_exception=e,
                        )

                    delay = ExponentialBackoffStrategy(retry_config).get_delay(attempt)
                    logger.warning(
                        f"Async operation attempt {attempt} failed, "
                        f"retrying in {delay:.2f}s: {e}"
                    )
                    await asyncio.sleep(delay)

            raise AiException(
                f"Async operation exhausted all retry attempts: {func.__name__}",
                severity=ErrorSeverity.HIGH,
            )

        return wrapper

    return decorator


def safe_operation(
    operation_name: str,
    fallback_value: Optional[T] = None,
    log_level: str = "error",
) -> Callable:
    """Decorator for safe operations with fallback."""

    def decorator(func: Callable[..., T]) -> Callable[..., T | None]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> T | None:
            try:
                return func(*args, **kwargs)
            except Exception as e:
                log_func = getattr(logger, log_level, logger.error)
                log_func(
                    f"Safe operation '{operation_name}' failed, "
                    f"returning fallback: {e}",
                    exc_info=True,
                )
                return fallback_value

        return wrapper

    return decorator


# For async operations, need to import asyncio conditionally
try:
    import asyncio
except ImportError:
    pass
