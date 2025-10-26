# Backend Structure Document

This document outlines the backend setup for the `react-supabase-cashier-sync` project. It describes how the online database, APIs, infrastructure, and security practices come together to support a local-first cashier app that syncs periodically with a central server.

## 1. Backend Architecture

• **BaaS-style architecture with Supabase**: We use Supabase as our central backend. Supabase provides a PostgreSQL database, authentication, real-time updates and auto-generated APIs.  
• **Design patterns**:  
  – _Serverless & managed services_: No dedicated server to manage; Supabase scales automatically.  
  – _Client-driven sync model_: The frontend holds the local SQLite store and a sync service that runs every five minutes.  
• **Scalability**:  
  – Supabase hosts PostgreSQL in a managed cluster, which grows as we add data or users.  
  – Its real-time engine handles thousands of concurrent listeners without extra configuration.  
• **Maintainability**:  
  – Database schema changes are handled via Supabase migrations.  
  – Business logic lives in isolated SQL functions or policies, reducing custom code.  
• **Performance**:  
  – Local reads and writes happen instantly in SQLite.  
  – Supabase connections are over a fast CDN network, minimizing latency.  

## 2. Database Management

**Central Database (Supabase PostgreSQL)**  
• Type: Relational (SQL)  
• Engine: PostgreSQL 13+ managed by Supabase  

**Local Database (SQLite)**  
• Type: Relational (SQL) embedded database  
• Options: `sql.js` in the browser or native SQLite in a desktop shell (Tauri/Electron)  

**Data Flow & Practices**  
• Local writes: All transactions, inventory changes, and customer records are first saved to SQLite.  
• Sync cycle: A five-minute interval process that:  1. Reads new/updated rows from SQLite.  2. Pushes changes to PostgreSQL via Supabase API.  3. Fetches remote changes and applies them locally.  
• Conflict handling: Timestamp-based "last write wins" or a custom merge strategy inside a sync function.  
• Backups & Migrations: Supabase provides point-in-time recovery and migration scripts.  

## 3. Database Schema

Below is an overview of our central PostgreSQL schema. It uses basic SQL syntax (PostgreSQL dialect).

-- Human-readable description of tables and fields  
• **users**: Stores cashier accounts.  
  – id (UUID)
  – email (text)
  – hashed_password (text)
  – created_at (timestamp)

• **products**: Catalog of items for sale.  
  – id (UUID)
  – name (text)
  – sku (text, unique)
  – price_cents (integer)
  – stock_quantity (integer)
  – updated_at (timestamp)

• **customers**: Customer records.  
  – id (UUID)
  – name (text)
  – phone (text)
  – email (text)
  – updated_at (timestamp)

• **sales**: A sale event.  
  – id (UUID)
  – user_id (UUID, foreign key → users.id)
  – customer_id (UUID, nullable → customers.id)
  – total_cents (integer)
  – created_at (timestamp)

• **sale_items**: Line items for each sale.  
  – id (UUID)
  – sale_id (UUID, foreign key → sales.id)
  – product_id (UUID, foreign key → products.id)
  – quantity (integer)
  – price_cents (integer)

• **sync_logs**: Tracks sync operations.  
  – id (UUID)
  – last_synced_at (timestamp)
  – status (text: ‘success’|‘failure’)
  – details (jsonb)

-- SQL definition for PostgreSQL

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  hashed_password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  price_cents INT NOT NULL,
  stock_quantity INT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales table
CREATE TABLE sales (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  customer_id UUID REFERENCES customers(id),
  total_cents INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sale Items table
CREATE TABLE sale_items (
  id UUID PRIMARY KEY,
  sale_id UUID REFERENCES sales(id),
  product_id UUID REFERENCES products(id),
  quantity INT NOT NULL,
  price_cents INT NOT NULL
);

-- Sync Logs table
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY,
  last_synced_at TIMESTAMPTZ,
  status TEXT,
  details JSONB
);
```

## 4. API Design and Endpoints

Supabase auto-generates a RESTful API based on our tables. We also add custom RPC (stored) functions for specific operations.

**Standard Endpoints (via PostgREST)**  
• GET /rest/v1/products  
• POST /rest/v1/products  
• GET /rest/v1/sales  
• POST /rest/v1/sales  
• GET /rest/v1/customers  
• PATCH /rest/v1/products?id=eq.<UUID>  
• DELETE /rest/v1/sale_items?id=eq.<UUID>  

**Authentication Endpoints (Supabase Auth)**  
• POST /auth/v1/signup  
• POST /auth/v1/token  
• DELETE /auth/v1/logout  

**Real-Time & Subscriptions**  
• Realtime channel on `products` or `sales` for live updates (WebSocket).  

**Custom RPC Functions**  
• `sync_changes()` — pulls a batch of changes since a given timestamp.  
• `resolve_conflict(record jsonb)` — applies server-side conflict resolution logic.  

## 5. Hosting Solutions

• **Supabase Platform**  
  – Managed PostgreSQL and real-time servers.  
  – Hosted on major cloud providers (AWS/GCP) with global regions.  
  – Built-in CDN for static assets and API endpoints.  
• **Frontend Hosting**  
  – Can be deployed on Netlify, Vercel, or any static hosting service.  
  – Uses a global CDN to serve the React app quickly anywhere.  

**Benefits**  
• High availability with minimal ops work.  
• Pay-as-you-grow pricing.  
• Automatic TLS, DDoS protection, and global scaling.  

## 6. Infrastructure Components

• **Load Balancers** (managed by Supabase) route API traffic to healthy database nodes.  
• **Caching**  
  – HTTP caching headers on REST responses.  
  – In-memory cache layer at edge via CDN.  
• **Content Delivery Network (CDN)**  
  – Supabase serves the JS client and API through a CDN.  
  – Frontend assets are also behind a global CDN.  
• **Edge Functions**  
  – Optional Supabase Edge Functions for lightweight custom logic (e.g., webhooks).  

## 7. Security Measures

• **Authentication & Authorization**  
  – Supabase Auth (JWT tokens) for secure session management.  
  – Role-based access control and Row-Level Security (RLS) policies in PostgreSQL.  
• **Encryption**  
  – TLS 1.2+ for all data in transit.  
  – Data-at-rest encryption on the Supabase database.  
• **Environment Variables**  
  – Secrets (API keys, JWT secrets) stored in Supabase settings, not in code.  
• **Input Validation**  
  – Zod schemas on the client before local writes.  
  – Database constraints and triggers to prevent invalid data.  
• **Audit Logging**  
  – `sync_logs` table captures detailed sync outcomes.  

## 8. Monitoring and Maintenance

• **Supabase Dashboard**  
  – Real-time metrics: active connections, query performance, error rates.  
  – Health alerts for high CPU, slow queries, or storage thresholds.  
• **Logging**  
  – Database logs and function logs visible in the Supabase UI.  
  – Integrate external logging (e.g., Sentry or Logflare) for client-side errors.  
• **Testing & CI**  
  – Vitest for unit/integration tests (mock Supabase, local DB).  
  – GitHub Actions to run migrations and tests on every push.  
• **Maintenance**  
  – Scheduled backups and migration rollouts managed by Supabase.  
  – Periodic review of RLS policies and database indices.  

## 9. Conclusion and Overall Backend Summary

The backend for `react-supabase-cashier-sync` relies on Supabase’s managed PostgreSQL and realtime APIs to power a local-first cashier application. Local SQLite ensures fast, offline-capable operations, while a five-minute sync service keeps all terminals aligned with the central database. With built-in authentication, row-level security, and scalable hosting, this backend structure delivers reliability, performance, and ease of maintenance in plain terms anyone can follow.