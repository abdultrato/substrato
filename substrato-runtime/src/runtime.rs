use crate::apps;
use crate::cache::{AutoCache, CachePolicy, CacheStats};
use crate::events::{EventBus, EventEnvelope};
use crate::module::{ModuleDescriptor, ModuleRegistry, ModuleState, RegistryError};
use serde_json::Value;
use std::collections::{HashMap, VecDeque};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex, RwLock};
use std::time::Duration;

#[derive(Debug, Clone, Copy, Default)]
pub struct RuntimeMetrics {
    pub published_events: usize,
    pub queued_offline_events: usize,
    pub loaded_modules: usize,
}

pub struct SubstratoRuntime {
    event_bus: Arc<EventBus>,
    registry: RwLock<ModuleRegistry>,
    caches: RwLock<HashMap<&'static str, Arc<AutoCache<String, Value>>>>,
    offline_queue: Mutex<VecDeque<EventEnvelope>>,
    published_events: AtomicUsize,
}

impl Default for SubstratoRuntime {
    fn default() -> Self {
        Self::new()
    }
}

impl SubstratoRuntime {
    pub fn new() -> Self {
        let event_bus = Arc::new(EventBus::default());
        let mut registry = ModuleRegistry::default();

        for descriptor in apps::all_descriptors() {
            registry
                .register(descriptor)
                .expect("app descriptor keys must be unique");
        }

        let runtime = Self {
            event_bus,
            registry: RwLock::new(registry),
            caches: RwLock::new(HashMap::new()),
            offline_queue: Mutex::new(VecDeque::new()),
            published_events: AtomicUsize::new(0),
        };

        runtime.initialize_module_caches();
        runtime
    }

    pub fn event_bus(&self) -> Arc<EventBus> {
        Arc::clone(&self.event_bus)
    }

    pub fn bootstrap(&self) -> Result<(), RegistryError> {
        let mut registry = self.registry.write().unwrap_or_else(|poison| poison.into_inner());
        registry.load_all()
    }

    pub fn publish(
        &self,
        topic: impl Into<String>,
        app: impl Into<String>,
        payload: Value,
        tenant_id: Option<String>,
    ) -> EventEnvelope {
        let event = if let Some(tenant_id) = tenant_id {
            EventEnvelope::new(topic, app, payload).with_tenant(tenant_id)
        } else {
            EventEnvelope::new(topic, app, payload)
        };

        self.event_bus.publish(&event);
        self.published_events.fetch_add(1, Ordering::Relaxed);
        event
    }

    pub fn queue_offline(
        &self,
        topic: impl Into<String>,
        app: impl Into<String>,
        payload: Value,
        tenant_id: Option<String>,
    ) -> EventEnvelope {
        let event = if let Some(tenant_id) = tenant_id {
            EventEnvelope::new(topic, app, payload).with_tenant(tenant_id)
        } else {
            EventEnvelope::new(topic, app, payload)
        };

        let mut queue = self.offline_queue.lock().unwrap_or_else(|poison| poison.into_inner());
        queue.push_back(event.clone());
        event
    }

    pub fn flush_offline(&self, max_events: usize) -> usize {
        let mut flushed = 0usize;
        let mut queue = self.offline_queue.lock().unwrap_or_else(|poison| poison.into_inner());

        while flushed < max_events {
            let Some(event) = queue.pop_front() else {
                break;
            };
            self.event_bus.publish(&event);
            self.published_events.fetch_add(1, Ordering::Relaxed);
            flushed += 1;
        }

        flushed
    }

    pub fn cache_put(&self, module_key: &'static str, key: impl Into<String>, value: Value) -> bool {
        let caches = self.caches.read().unwrap_or_else(|poison| poison.into_inner());
        if let Some(cache) = caches.get(module_key) {
            cache.set(key.into(), value);
            return true;
        }
        false
    }

    pub fn cache_get(&self, module_key: &'static str, key: &str) -> Option<Value> {
        let caches = self.caches.read().unwrap_or_else(|poison| poison.into_inner());
        let cache = caches.get(module_key)?;
        cache.get(&key.to_string())
    }

    pub fn cache_stats(&self, module_key: &'static str) -> Option<CacheStats> {
        let caches = self.caches.read().unwrap_or_else(|poison| poison.into_inner());
        caches.get(module_key).map(|cache| cache.stats())
    }

    pub fn module_states(&self) -> Vec<(&'static str, ModuleState, Option<String>)> {
        let registry = self.registry.read().unwrap_or_else(|poison| poison.into_inner());
        registry.states()
    }

    pub fn module_load_order(&self) -> Vec<&'static str> {
        let registry = self.registry.read().unwrap_or_else(|poison| poison.into_inner());
        registry.load_order().to_vec()
    }

    pub fn metrics(&self) -> RuntimeMetrics {
        let queued_offline_events = {
            let queue = self.offline_queue.lock().unwrap_or_else(|poison| poison.into_inner());
            queue.len()
        };

        let loaded_modules = {
            let registry = self.registry.read().unwrap_or_else(|poison| poison.into_inner());
            registry
                .states()
                .iter()
                .filter(|(_, state, _)| *state == ModuleState::Loaded)
                .count()
        };

        RuntimeMetrics {
            published_events: self.published_events.load(Ordering::Relaxed),
            queued_offline_events,
            loaded_modules,
        }
    }

    fn initialize_module_caches(&self) {
        let descriptors = {
            let registry = self.registry.read().unwrap_or_else(|poison| poison.into_inner());
            registry.descriptors()
        };

        let mut caches = self.caches.write().unwrap_or_else(|poison| poison.into_inner());
        for descriptor in descriptors {
            let policy = CachePolicy::new(
                Duration::from_secs(descriptor.cache_ttl_secs.max(1)),
                descriptor.cache_max_entries.max(100),
                32,
            );
            caches.insert(descriptor.key, Arc::new(AutoCache::new(policy)));
        }
    }

    pub fn descriptor(module_key: &'static str) -> Option<ModuleDescriptor> {
        apps::all_descriptors()
            .into_iter()
            .find(|descriptor| descriptor.key == module_key)
    }
}

#[cfg(test)]
mod tests {
    use super::SubstratoRuntime;
    use crate::events::EventHandler;
    use serde_json::json;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;

    #[test]
    fn bootstrap_loads_modules() {
        let runtime = SubstratoRuntime::new();
        runtime.bootstrap().expect("bootstrap must load all descriptors");
        assert!(!runtime.module_load_order().is_empty());
    }

    #[test]
    fn cache_auto_management_works() {
        let runtime = SubstratoRuntime::new();
        let inserted = runtime.cache_put("apps.accounting", "invoice:1", json!({"total": 10}));
        assert!(inserted);

        let value = runtime.cache_get("apps.accounting", "invoice:1");
        assert!(value.is_some());
    }

    #[test]
    fn offline_queue_flush_publishes_events() {
        let runtime = SubstratoRuntime::new();
        let counter = Arc::new(AtomicUsize::new(0));
        let counter_clone = Arc::clone(&counter);

        runtime.event_bus().subscribe(
            "payments.received",
            Arc::new(move |_: &crate::events::EventEnvelope| {
                counter_clone.fetch_add(1, Ordering::Relaxed);
            }) as EventHandler,
        );

        runtime.queue_offline("payments.received", "payments", json!({"amount": 200}), None);
        let flushed = runtime.flush_offline(20);
        assert_eq!(flushed, 1);
        assert_eq!(counter.load(Ordering::Relaxed), 1);
    }
}
