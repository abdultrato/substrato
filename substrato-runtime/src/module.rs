use std::collections::{HashMap, HashSet};
use std::fmt::{Display, Formatter};

#[derive(Debug, Clone, Copy, Eq, PartialEq)]
pub enum ModuleState {
    Registered,
    Loaded,
    Failed,
}

#[derive(Debug, Clone, Copy)]
pub struct ModuleDescriptor {
    pub key: &'static str,
    pub app: &'static str,
    pub version: &'static str,
    pub dependencies: &'static [&'static str],
    pub consumed_events: &'static [&'static str],
    pub produced_events: &'static [&'static str],
    pub cache_ttl_secs: u64,
    pub cache_max_entries: usize,
}

impl ModuleDescriptor {
    pub const fn new(
        key: &'static str,
        app: &'static str,
        version: &'static str,
        dependencies: &'static [&'static str],
        consumed_events: &'static [&'static str],
        produced_events: &'static [&'static str],
        cache_ttl_secs: u64,
        cache_max_entries: usize,
    ) -> Self {
        Self {
            key,
            app,
            version,
            dependencies,
            consumed_events,
            produced_events,
            cache_ttl_secs,
            cache_max_entries,
        }
    }
}

#[derive(Debug, Clone)]
pub enum RegistryError {
    DuplicateModule(&'static str),
    UnknownModule(&'static str),
    MissingDependency {
        module: &'static str,
        dependency: &'static str,
    },
    CircularDependency(&'static str),
}

impl Display for RegistryError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::DuplicateModule(key) => write!(f, "module already registered: {key}"),
            Self::UnknownModule(key) => write!(f, "unknown module: {key}"),
            Self::MissingDependency { module, dependency } => {
                write!(f, "module {module} depends on missing module {dependency}")
            }
            Self::CircularDependency(key) => write!(f, "circular dependency detected at module {key}"),
        }
    }
}

impl std::error::Error for RegistryError {}

#[derive(Debug, Clone)]
struct RegisteredModule {
    descriptor: ModuleDescriptor,
    state: ModuleState,
    last_error: Option<String>,
}

#[derive(Debug, Default)]
pub struct ModuleRegistry {
    modules: HashMap<&'static str, RegisteredModule>,
    load_order: Vec<&'static str>,
}

impl ModuleRegistry {
    pub fn register(&mut self, descriptor: ModuleDescriptor) -> Result<(), RegistryError> {
        if self.modules.contains_key(descriptor.key) {
            return Err(RegistryError::DuplicateModule(descriptor.key));
        }

        self.modules.insert(
            descriptor.key,
            RegisteredModule {
                descriptor,
                state: ModuleState::Registered,
                last_error: None,
            },
        );
        Ok(())
    }

    pub fn load_all(&mut self) -> Result<(), RegistryError> {
        let module_keys: Vec<&'static str> = self.modules.keys().copied().collect();
        for module_key in module_keys {
            self.load(module_key)?;
        }
        Ok(())
    }

    pub fn load(&mut self, module_key: &'static str) -> Result<(), RegistryError> {
        let mut visiting = HashSet::new();
        self.load_recursive(module_key, &mut visiting)
    }

    pub fn state_of(&self, module_key: &'static str) -> Option<ModuleState> {
        self.modules.get(module_key).map(|module| module.state)
    }

    pub fn load_order(&self) -> &[&'static str] {
        &self.load_order
    }

    pub fn descriptors(&self) -> Vec<ModuleDescriptor> {
        self.modules.values().map(|module| module.descriptor).collect()
    }

    pub fn states(&self) -> Vec<(&'static str, ModuleState, Option<String>)> {
        self.modules
            .iter()
            .map(|(key, module)| (*key, module.state, module.last_error.clone()))
            .collect()
    }

    fn load_recursive(
        &mut self,
        module_key: &'static str,
        visiting: &mut HashSet<&'static str>,
    ) -> Result<(), RegistryError> {
        let current_state = self
            .modules
            .get(module_key)
            .ok_or(RegistryError::UnknownModule(module_key))?
            .state;

        if current_state == ModuleState::Loaded {
            return Ok(());
        }

        if visiting.contains(module_key) {
            if let Some(record) = self.modules.get_mut(module_key) {
                record.state = ModuleState::Failed;
                record.last_error = Some("circular dependency".to_string());
            }
            return Err(RegistryError::CircularDependency(module_key));
        }

        visiting.insert(module_key);

        let dependencies = self
            .modules
            .get(module_key)
            .ok_or(RegistryError::UnknownModule(module_key))?
            .descriptor
            .dependencies;

        for dependency in dependencies.iter().copied() {
            if !self.modules.contains_key(dependency) {
                if let Some(record) = self.modules.get_mut(module_key) {
                    record.state = ModuleState::Failed;
                    record.last_error = Some(format!("missing dependency: {dependency}"));
                }
                return Err(RegistryError::MissingDependency {
                    module: module_key,
                    dependency,
                });
            }
            self.load_recursive(dependency, visiting)?;
        }

        visiting.remove(module_key);

        if let Some(record) = self.modules.get_mut(module_key) {
            record.state = ModuleState::Loaded;
            record.last_error = None;
        }
        if !self.load_order.contains(&module_key) {
            self.load_order.push(module_key);
        }
        Ok(())
    }
}
