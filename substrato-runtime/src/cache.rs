use std::collections::HashMap;
use std::hash::Hash;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::RwLock;
use std::time::{Duration, Instant};

#[derive(Debug, Clone, Copy)]
pub struct CachePolicy {
    pub ttl: Duration,
    pub max_entries: usize,
    pub cleanup_every_ops: u64,
}

impl CachePolicy {
    pub fn new(ttl: Duration, max_entries: usize, cleanup_every_ops: u64) -> Self {
        Self {
            ttl,
            max_entries,
            cleanup_every_ops: cleanup_every_ops.max(1),
        }
    }
}

impl Default for CachePolicy {
    fn default() -> Self {
        Self {
            ttl: Duration::from_secs(300),
            max_entries: 1_000,
            cleanup_every_ops: 64,
        }
    }
}

#[derive(Debug, Clone, Copy, Default)]
pub struct CacheStats {
    pub hits: u64,
    pub misses: u64,
    pub expired_evictions: u64,
    pub size_evictions: u64,
    pub live_entries: usize,
}

#[derive(Debug, Clone)]
struct CacheEntry<V>
where
    V: Clone,
{
    value: V,
    inserted_at: Instant,
    expires_at: Instant,
}

pub struct AutoCache<K, V>
where
    K: Eq + Hash + Clone,
    V: Clone,
{
    policy: CachePolicy,
    store: RwLock<HashMap<K, CacheEntry<V>>>,
    ops: AtomicU64,
    hits: AtomicU64,
    misses: AtomicU64,
    expired_evictions: AtomicU64,
    size_evictions: AtomicU64,
}

impl<K, V> AutoCache<K, V>
where
    K: Eq + Hash + Clone,
    V: Clone,
{
    pub fn new(policy: CachePolicy) -> Self {
        Self {
            policy,
            store: RwLock::new(HashMap::new()),
            ops: AtomicU64::new(0),
            hits: AtomicU64::new(0),
            misses: AtomicU64::new(0),
            expired_evictions: AtomicU64::new(0),
            size_evictions: AtomicU64::new(0),
        }
    }

    pub fn get(&self, key: &K) -> Option<V> {
        let now = Instant::now();
        let mut store = self.store.write().unwrap_or_else(|poison| poison.into_inner());

        if let Some(value) = store.get(key).and_then(|entry| (now <= entry.expires_at).then(|| entry.value.clone())) {
            self.hits.fetch_add(1, Ordering::Relaxed);
            self.maybe_cleanup(&mut store, now);
            return Some(value);
        }

        if store.remove(key).is_some() {
            self.expired_evictions.fetch_add(1, Ordering::Relaxed);
        }

        self.misses.fetch_add(1, Ordering::Relaxed);
        self.maybe_cleanup(&mut store, now);
        None
    }

    pub fn set(&self, key: K, value: V) {
        let now = Instant::now();
        let mut store = self.store.write().unwrap_or_else(|poison| poison.into_inner());
        let entry = CacheEntry {
            value,
            inserted_at: now,
            expires_at: now + self.policy.ttl,
        };
        store.insert(key, entry);
        self.cleanup_locked(&mut store, now);
    }

    pub fn invalidate(&self, key: &K) -> bool {
        let mut store = self.store.write().unwrap_or_else(|poison| poison.into_inner());
        store.remove(key).is_some()
    }

    pub fn get_or_insert_with<F>(&self, key: K, builder: F) -> V
    where
        F: FnOnce() -> V,
    {
        if let Some(value) = self.get(&key) {
            return value;
        }
        let value = builder();
        self.set(key, value.clone());
        value
    }

    pub fn cleanup(&self) {
        let now = Instant::now();
        let mut store = self.store.write().unwrap_or_else(|poison| poison.into_inner());
        self.cleanup_locked(&mut store, now);
    }

    pub fn stats(&self) -> CacheStats {
        let store = self.store.read().unwrap_or_else(|poison| poison.into_inner());
        CacheStats {
            hits: self.hits.load(Ordering::Relaxed),
            misses: self.misses.load(Ordering::Relaxed),
            expired_evictions: self.expired_evictions.load(Ordering::Relaxed),
            size_evictions: self.size_evictions.load(Ordering::Relaxed),
            live_entries: store.len(),
        }
    }

    fn maybe_cleanup(&self, store: &mut HashMap<K, CacheEntry<V>>, now: Instant) {
        let current_ops = self.ops.fetch_add(1, Ordering::Relaxed) + 1;
        if current_ops % self.policy.cleanup_every_ops == 0 {
            self.cleanup_locked(store, now);
        }
    }

    fn cleanup_locked(&self, store: &mut HashMap<K, CacheEntry<V>>, now: Instant) {
        let expired_keys: Vec<K> = store
            .iter()
            .filter_map(|(key, entry)| (entry.expires_at <= now).then_some(key.clone()))
            .collect();

        for key in expired_keys {
            if store.remove(&key).is_some() {
                self.expired_evictions.fetch_add(1, Ordering::Relaxed);
            }
        }

        let max_entries = self.policy.max_entries;
        if store.len() <= max_entries {
            return;
        }

        let mut by_age: Vec<(K, Instant)> = store
            .iter()
            .map(|(key, entry)| (key.clone(), entry.inserted_at))
            .collect();
        by_age.sort_by_key(|(_, inserted_at)| *inserted_at);

        let remove_count = store.len().saturating_sub(max_entries);
        for (key, _) in by_age.into_iter().take(remove_count) {
            if store.remove(&key).is_some() {
                self.size_evictions.fetch_add(1, Ordering::Relaxed);
            }
        }
    }
}
