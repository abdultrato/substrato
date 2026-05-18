use serde_json::Value;
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, RwLock};
use std::time::{SystemTime, UNIX_EPOCH};

static EVENT_SEQUENCE: AtomicU64 = AtomicU64::new(1);

#[derive(Debug, Clone)]
pub struct EventEnvelope {
    pub id: String,
    pub topic: String,
    pub app: String,
    pub tenant_id: Option<String>,
    pub payload: Value,
    pub occurred_at_millis: u128,
}

impl EventEnvelope {
    pub fn new(topic: impl Into<String>, app: impl Into<String>, payload: Value) -> Self {
        let occurred_at_millis = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_millis())
            .unwrap_or_default();
        let sequence = EVENT_SEQUENCE.fetch_add(1, Ordering::Relaxed);
        let id = format!("evt-{occurred_at_millis}-{sequence}");

        Self {
            id,
            topic: topic.into(),
            app: app.into(),
            tenant_id: None,
            payload,
            occurred_at_millis,
        }
    }

    pub fn with_tenant(mut self, tenant_id: impl Into<String>) -> Self {
        self.tenant_id = Some(tenant_id.into());
        self
    }
}

pub type EventHandler = Arc<dyn for<'a> Fn(&'a EventEnvelope) + Send + Sync + 'static>;

#[derive(Default)]
pub struct EventBus {
    subscribers: RwLock<HashMap<String, Vec<EventHandler>>>,
}

impl EventBus {
    pub fn subscribe(&self, topic: impl Into<String>, handler: EventHandler) {
        let mut subscribers = self.subscribers.write().unwrap_or_else(|poison| poison.into_inner());
        subscribers.entry(topic.into()).or_default().push(handler);
    }

    pub fn publish(&self, event: &EventEnvelope) {
        let handlers = {
            let subscribers = self.subscribers.read().unwrap_or_else(|poison| poison.into_inner());
            let mut selected = subscribers.get(&event.topic).cloned().unwrap_or_default();
            if let Some(wildcard_handlers) = subscribers.get("*") {
                selected.extend_from_slice(wildcard_handlers);
            }
            selected
        };

        for handler in handlers {
            handler(event);
        }
    }

    pub fn subscriber_count(&self, topic: &str) -> usize {
        let subscribers = self.subscribers.read().unwrap_or_else(|poison| poison.into_inner());
        subscribers.get(topic).map(|handlers| handlers.len()).unwrap_or(0)
    }
}
