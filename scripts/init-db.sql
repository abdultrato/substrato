-- ============================================================================
-- INIT-DB.SQL
-- Script de inicialização do PostgreSQL
-- ============================================================================

-- Extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Garantir schema
CREATE SCHEMA IF NOT EXISTS public;

-- Configurações de desempenho
ALTER DATABASE substrato SET statement_timeout = '30s';
ALTER DATABASE substrato SET lock_timeout = '10s';
ALTER DATABASE substrato SET idle_in_transaction_session_timeout = '60s';

-- Timezone padrão
ALTER DATABASE substrato SET timezone TO 'UTC';
