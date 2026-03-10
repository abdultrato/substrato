-- ============================================================================
-- INIT-DB.SQL - Script de inicialização do banco de dados
-- ============================================================================

-- Criar extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Criar schemas
CREATE SCHEMA IF NOT EXISTS public;

-- Ajustes de performance
ALTER DATABASE substrato_db SET statement_timeout = '30s';
ALTER DATABASE substrato_db SET lock_timeout = '10s';
ALTER DATABASE substrato_db SET idle_in_transaction_session_timeout = '60s';

-- Log de conexão
\echo 'PostgreSQL database initialized successfully!'
