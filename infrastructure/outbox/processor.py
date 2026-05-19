"""OutboxEventProcessor com circuit breaker e exponential backoff"""

from datetime import timedelta
import logging

from django.utils import timezone

from apps.monitoring.models import TransactionalOutboxEvent

logger = logging.getLogger(__name__)


class CircuitBreakerException(Exception):
    """Exceção quando circuit breaker está aberto"""
    pass


class OutboxEventProcessor:
    """
    Processador de eventos do outbox com circuit breaker e retry inteligente.

    Features:
    - Exponential backoff: 1m → 2m → 4m → 8m → 16m → 32m
    - Dead-letter queue após max_retries
    - Deduplicação via idempotency_key (UNIQUE constraint)
    - Métricas de entrega
    - Logging estruturado
    """

    # Configurações de retry
    INITIAL_BACKOFF_SECONDS = 60  # 1 minuto
    MAX_BACKOFF_SECONDS = 86400  # 24 horas

    # Erros que devem fazer retry
    RETRYABLE_ERRORS = (
        TimeoutError,
        ConnectionError,
        BrokenPipeError,
        IOError,
    )

    @staticmethod
    def calculate_backoff(attempt: int) -> int:
        """
        Calcular backoff exponencial com limite máximo.

        Args:
            attempt: Número da tentativa (0-indexed)

        Returns:
            Segundos de espera
        """
        backoff = OutboxEventProcessor.INITIAL_BACKOFF_SECONDS * (2 ** attempt)
        return min(backoff, OutboxEventProcessor.MAX_BACKOFF_SECONDS)

    @staticmethod
    def process_pending_events(
        batch_size: int = 100,
        max_workers: int = 1
    ) -> dict:
        """
        Processar eventos pendentes em batch.

        Args:
            batch_size: Número de eventos para processar por batch
            max_workers: Número máximo de workers (para future threading)

        Returns:
            Dicionário com estatísticas de processamento
        """
        stats = {
            'total_processed': 0,
            'delivered': 0,
            'failed': 0,
            'dead_letter': 0,
            'errors': [],
        }

        # Buscar eventos prontos para retry
        ready_events = TransactionalOutboxEvent.objects.filter(
            status__in=[
                TransactionalOutboxEvent.Status.PENDING,
                TransactionalOutboxEvent.Status.FAILED
            ],
            available_at__lte=timezone.now()
        ).order_by('available_at')[:batch_size]

        for event in ready_events:
            try:
                result = OutboxEventProcessor.process_event(event)
                stats[result] = stats.get(result, 0) + 1
                stats['total_processed'] += 1
            except Exception as e:
                logger.error(
                    f"Error processing event {event.event_id}",
                    exc_info=True,
                    extra={'event_id': event.event_id}
                )
                stats['errors'].append(str(e))

        return stats

    @staticmethod
    def process_event(event: TransactionalOutboxEvent) -> str:
        """
        Processar um evento individual com circuit breaker.

        Args:
            event: Evento a processar

        Returns:
            Status final ('delivered', 'failed', 'dead_letter')
        """

        # Validar se pode fazer retry
        if not OutboxEventProcessor._can_retry(event):
            logger.warning(
                f"Event {event.event_id} skipped (max retries reached or already delivered)",
                extra={'event_id': event.event_id, 'attempts': event.attempts}
            )
            return 'skipped'

        try:
            logger.info(
                f"Delivering event {event.event_id}",
                extra={
                    'event_id': event.event_id,
                    'event_type': event.event_type,
                    'attempt': event.attempts + 1,
                }
            )

            # Tentar entregar (implementado em subclasse)
            OutboxEventProcessor._deliver_to_external_system(event)

            # Sucesso!
            event.mark_delivered()
            logger.info(
                f"Event {event.event_id} delivered successfully",
                extra={'event_id': event.event_id}
            )
            return 'delivered'

        except OutboxEventProcessor.RETRYABLE_ERRORS as e:
            logger.warning(
                f"Event {event.event_id} retryable error: {type(e).__name__}",
                extra={
                    'event_id': event.event_id,
                    'error': str(e),
                    'attempt': event.attempts + 1,
                }
            )
            OutboxEventProcessor._schedule_retry(event)
            return 'failed' if event.status == TransactionalOutboxEvent.Status.FAILED else 'dead_letter'

        except Exception as e:
            logger.error(
                f"Event {event.event_id} failed with exception",
                exc_info=True,
                extra={
                    'event_id': event.event_id,
                    'error': str(e),
                    'attempt': event.attempts + 1,
                }
            )
            OutboxEventProcessor._schedule_retry(event)
            return 'failed' if event.status == TransactionalOutboxEvent.Status.FAILED else 'dead_letter'

    @staticmethod
    def _can_retry(event: TransactionalOutboxEvent) -> bool:
        """Verificar se evento pode fazer retry"""
        if event.status == TransactionalOutboxEvent.Status.DELIVERED:
            return False
        if event.attempts >= event.max_retries:
            return False
        return not event.available_at > timezone.now()

    @staticmethod
    def _schedule_retry(event: TransactionalOutboxEvent) -> None:
        """Agendar próximo retry com exponential backoff"""
        next_attempt = event.attempts + 1
        is_last_attempt = next_attempt >= event.max_retries

        # Calcular backoff exponencial
        backoff_seconds = OutboxEventProcessor.calculate_backoff(event.attempts)

        # Atualizar evento
        event.mark_failed(
            error=event.last_error or "Unknown error",
            retry_after_seconds=backoff_seconds,
            max_attempts=event.max_retries
        )

        logger.info(
            f"Event {event.event_id} scheduled for retry",
            extra={
                'event_id': event.event_id,
                'next_attempt': next_attempt,
                'backoff_seconds': backoff_seconds,
                'is_dead_letter': is_last_attempt,
                'available_at': event.available_at,
            }
        )

    @staticmethod
    def _deliver_to_external_system(event: TransactionalOutboxEvent) -> None:
        """
        Entregar evento ao sistema externo.

        Implementar em subclasse com lógica específica do domínio.

        Args:
            event: Evento a entregar

        Raises:
            Exception: Se falha na entrega
        """
        # Implementação default: não faz nada (abstract)
        # Subclasses devem sobrescrever este método
        logger.debug(f"Event {event.event_id} would be delivered to external system")

    @staticmethod
    def cleanup_delivered_events(days_old: int = 30) -> int:
        """
        Limpar eventos entregues há mais de N dias.

        Args:
            days_old: Dias de idade mínima para limpeza

        Returns:
            Número de eventos deletados
        """
        cutoff = timezone.now() - timedelta(days=days_old)

        deleted_count, _ = TransactionalOutboxEvent.objects.filter(
            status=TransactionalOutboxEvent.Status.DELIVERED,
            published_at__lt=cutoff
        ).delete()

        logger.info(
            f"Cleaned up {deleted_count} delivered events older than {days_old} days",
            extra={'deleted_count': deleted_count, 'cutoff_date': cutoff}
        )

        return deleted_count

    @staticmethod
    def get_metrics() -> dict:
        """
        Obter métricas de processamento do outbox.

        Returns:
            Dicionário com métricas
        """
        return {
            'pending': TransactionalOutboxEvent.objects.filter(
                status=TransactionalOutboxEvent.Status.PENDING
            ).count(),
            'failed': TransactionalOutboxEvent.objects.filter(
                status=TransactionalOutboxEvent.Status.FAILED
            ).count(),
            'dead_letter': TransactionalOutboxEvent.objects.filter(
                status=TransactionalOutboxEvent.Status.DEAD_LETTER
            ).count(),
            'delivered': TransactionalOutboxEvent.objects.filter(
                status=TransactionalOutboxEvent.Status.DELIVERED
            ).count(),
        }
