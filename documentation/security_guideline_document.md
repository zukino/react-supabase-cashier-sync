# Security Guidelines for react-supabase-cashier-sync

This document provides comprehensive security guidelines tailored to the `react-supabase-cashier-sync` application—a local-first, offline-capable point-of-sale (POS) React app using a local SQLite store and periodic synchronization with a Supabase backend. It aligns with core security principles and best practices to ensure a robust, resilient, and secure solution by design.

---

## Table of Contents
1. Introduction & Threat Model
2. Authentication & Access Control
3. Input Validation & Data Handling
4. Data Protection & Privacy
5. API & Synchronization Service Security
6. Web Application Security Hygiene
7. Local Database Security
8. Infrastructure & Configuration Management
9. Dependency Management
10. Testing, Monitoring & Incident Response

---

## 1. Introduction & Threat Model

**Application Overview:**
- A React + Vite POS interface that writes transactions, inventory, and customer data to a local SQLite store (in-browser via `sql.js` or desktop via Tauri/Electron).  
- A background sync engine that pushes local changes to Supabase and fetches remote updates every 5 minutes.  

**Key Assets to Protect:**
- Customer and transaction data (PII, payment details).  
- Offline/online sync logic and conflict resolution mechanisms.  
- Supabase credentials and API keys.  
- Local database files.

**Primary Threats:**
- Unauthorized access to customer or financial data.  
- Injection attacks (SQL, NoSQL, XSS) via form inputs or sync payloads.  
- Man-in-the-middle attacks during sync.  
- Compromise of local device or desktop app by malware.  
- Excessive permissions or insecure defaults in packaging.

---

## 2. Authentication & Access Control

- **Supabase Auth Integration:**  
  • Enforce strong password policies (minimum length, complexity).  
  • Use Argon2 or bcrypt to store server-side credentials.  
  • Enable Multi-Factor Authentication (MFA) for administrative users.  

- **Role-Based Access Control (RBAC):**  
  • Define roles (e.g., `cashier`, `manager`, `admin`).  
  • Enforce server-side permission checks on every Supabase function or row-level policy (RLS) for CRUD operations.  

- **JWT Security:**  
  • Never allow the `alg: none` option.  
  • Validate `exp`, `iat`, `iss`, and `aud` claims on each request.  
  • Rotate and revoke tokens on logout or credential change.  

- **Session Management:**  
  • Use short-lived tokens (e.g., 15 min access, 7 days refresh).  
  • Store tokens in secure, HttpOnly cookies (not `localStorage`).  
  • Set `SameSite=Lax/Strict`, `Secure`, and `HttpOnly` attributes.  

---

## 3. Input Validation & Data Handling

- **Client & Server-Side Validation:**  
  • Use Zod schemas in React Hook Form for immediate feedback.  
  • Mirror identical validation rules in server functions (Supabase Edge Functions or backend) to prevent bypass.  

- **Prevent Injection:**  
  • Local DB: Use parameterized statements or prepared queries in `sql.js` or native SQLite driver.  
  • Supabase: Rely on their query builder/ORM; avoid string-concatenated SQL.  

- **Sanitize User Input:**  
  • Strip or encode HTML in free-text fields to mitigate XSS.  
  • Enforce whitelists for enumeration or select fields (e.g., payment methods).  

- **File Uploads & Imports:**  
  • If importing product lists or receipts, validate file type, size, and content.  
  • Use a sandboxed parser and store files outside web-accessible paths.

---

## 4. Data Protection & Privacy

- **Encryption in Transit:**  
  • Enforce TLS 1.2+ for all Supabase endpoints and any desktop API calls.  
  • Disable insecure ciphers (SSLv3/TLS1.0/1.1).  

- **Encryption at Rest:**  
  • For desktop apps: encrypt the local SQLite file with a user-derived key or OS-level full-disk encryption.  
  • In‐browser: consider encrypting IndexedDB blobs with Web Crypto before writing.  

- **PII Minimization & Masking:**  
  • Only collect required customer fields.  
  • Mask sensitive fields in logs and UI (e.g., credit card last 4 digits only).  

- **Secrets Management:**  
  • Do not hardcode Supabase keys in client code.  
  • Store secrets in environment variables or a secure vault (Tauri secret store, CI/CD protected variables).

---

## 5. API & Synchronization Service Security

- **Authentication for Sync Calls:**  
  • Authenticate sync requests to Supabase using a dedicated service account with the least privileges.  
  • Reject calls without valid tokens or rotated API keys.

- **Rate Limiting & Throttling:**  
  • Apply rate limits on sync endpoints to prevent DoS / runaway loops.  

- **CORS & CSRF Protections:**  
  • CORS: Allow only your domain(s) in production.  
  • CSRF: Use Synchronizer Tokens for any state-changing API accessed via browser.

- **Conflict Resolution & Integrity:**  
  • Sign sync payloads or include HMAC checksums to detect tampering.  
  • Log and alert on repeated conflicts or errors.  

- **Error Handling & Secure Fail-Safe:**  
  • Surface user-friendly sync statuses (e.g., offline, retrying in 30s).  
  • Do not expose stack traces or internal SQL queries in UI or logs.

---

## 6. Web Application Security Hygiene

- **Security Headers:**  
  • Content-Security-Policy (CSP) to whitelist script/style sources.  
  • Strict-Transport-Security (HSTS) with a long max age.  
  • X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy: no-referrer-when-downgrade.

- **XSS Mitigation:**  
  • Escape all dynamic content in JSX by default.  
  • Use SRI (Subresource Integrity) for external scripts.

- **Cookie Security:**  
  • Set `Secure`, `HttpOnly`, and `SameSite` on session cookies.

- **Disable Dev Tools in Production Build:**  
  • Remove source maps and debug flags.  
  • Ensure Vite’s `define` plugin doesn’t leak `process.env`.

---

## 7. Local Database Security

- **Scoped File Permissions:**  
  • Desktop: restrict SQLite file to application user only (e.g., `chmod 600`).  
  • In-browser: use IndexedDB originsplit so only your domain can read.

- **Validate Queries & Migrations:**  
  • Review any automatic schema migration scripts for unsafe DDL.

- **Backup & Recovery:**  
  • Provide encrypted backups with user consent.  
  • Allow secure export/import flows (e.g., encrypted JSON).

---

## 8. Infrastructure & Configuration Management

- **Secure Defaults:**  
  • Disable demo or sample accounts in production builds.  
  • Never use default Supabase RLS policies—define explicit rules.

- **OS & Packaging Hardening (Desktop):**  
  • Disable auto-update servers unless TLS and code signing are enforced.  
  • Sign installers and binaries.  

- **TLS/SSL Configuration:**  
  • Enforce HSTS.  
  • Regularly test with tools like SSL Labs.

- **Monitoring & Logging:**  
  • Aggregate errors (e.g., Sentry) without logging PII or secrets.  
  • Alert on repeated sync failures or unauthorized attempts.

---

## 9. Dependency Management

- **Lockfiles & SCA:**  
  • Commit `package-lock.json`/`yarn.lock`.  
  • Integrate automated scanning (Dependabot, Snyk) for CVEs.

- **Minimal Footprint:**  
  • Audit and remove unused dependencies.  
  • Prefer well-maintained, security-focused packages.

- **Regular Updates:**  
  • Schedule periodic reviews and updates of dependencies.  
  • Test sync logic after upgrades.

---

## 10. Testing, Monitoring & Incident Response

- **Unit & Integration Tests:**  
  • Mock Supabase and local DB to test validation, conflict cases, and failure modes.  
  • Include security tests for XSS payloads, SQL injection attempts.

- **Penetration Testing:**  
  • Conduct periodic pentests on the running app and sync API.  

- **Incident Response Plan:**  
  • Define steps for breach detection, customer notification, data recovery, and key rotation.  
  • Maintain a runbook for sync service failures and data corruption events.

---

Adherence to these guidelines will ensure that `react-supabase-cashier-sync` remains resilient against threats, protects sensitive customer and transactional data, and maintains a trusted offline/online experience for point-of-sale operations.

*End of Document*