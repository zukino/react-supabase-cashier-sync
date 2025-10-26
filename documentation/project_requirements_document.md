# Project Requirements Document (PRD)

## 1. Project Overview

This project is a **local-first cashier application** that runs in a web browser (or desktop wrapper) and lets retail staff process sales, manage inventory, and track customers even when offline. All transactions are stored immediately in a local SQLite database (via `sql.js` or a native library) for reliable, fast performance at the point of sale. Every five minutes, the app synchronizes new or updated records with a central Supabase backend—ensuring all terminals stay in sync without disrupting the cashier flow.

The main goal is to combine the responsiveness and offline reliability of a local database with the collaborative power of a cloud service. Cashiers get instant feedback when recording sales, while managers benefit from up-to-date data across multiple locations. Success for this project means sub-second UI interactions at the checkout, zero data loss during connectivity hiccups, and clear indicators showing sync status and any errors.

---

## 2. In-Scope vs. Out-of-Scope

**In-Scope (Version 1)**
- Point-of-sale interface built with React and Vite, including product lookup, quantity inputs, and payment dialogs.  
- Local SQLite database integration (`sql.js` in browser or native SQLite in a desktop wrapper) for storing transactions, inventory, and customer data.  
- Five-minute background synchronization engine that pushes local changes to Supabase and pulls remote updates.  
- Basic conflict resolution strategy ("last write wins").  
- Sync status indicator in the UI (e.g., “Syncing…,” “Last synced: X minutes ago,” “Offline”).  
- User authentication via Supabase Auth (email/password).  
- Form handling using React Hook Form and validation with Zod schemas.  
- Responsive, accessible UI components built with shadcn/ui and styled with Tailwind CSS.  
- Dark/light mode toggle-managed by `next-themes`.

**Out-of-Scope (Later Phases)**
- Advanced analytics and reporting dashboards.  
- Multi-user roles and permissions beyond basic authentication.  
- Integration with external payment providers (Stripe, PayPal).  
- Desktop-only features (printer drivers, barcode scanner APIs) unless wrapped in Tauri/Electron.  
- Real-time multi-terminal collaboration (beyond periodic sync).  
- Mobile-specific UI optimizations and offline app packaging (PWA enhancements).  

---

## 3. User Flow

A cashier opens the application on their terminal. On first load, they see a login screen powered by Supabase Auth. After entering credentials (or skipping login in offline mode), they land on the **Dashboard**, which shows a search bar, a list of today’s sales, and a sidebar for navigating to **Inventory**, **Customers**, and **Sync Status**. The app immediately reads from the local SQLite database, so the UI is ready within a second, even if the network is down.

When a sale begins, the cashier scans or types a product code, enters a quantity, and clicks **Add to Cart**. All these actions update the local database instantly (optimistic UI). The payment dialog pops up—confirmed sales are stored locally and appear in the sales list without delay. In the background, every five minutes (or via a manual **Sync Now** button), the app runs the sync engine. It collects new and updated records, pushes them to Supabase, fetches remote changes, and updates the local store. The sync indicator in the header updates to inform the user of success or any errors.

---

## 4. Core Features

- **Local Database Layer**: SQLite integration via `sql.js` (browser) or native SQLite (desktop).
- **Cashier Interface**: Fast, responsive UI for scanning products, adjusting quantities, and processing payments.
- **Background Sync Engine**: Two-way sync every five minutes with conflict resolution.
- **Sync Status Indicator**: Visual feedback on sync progress, last sync time, and error states.
- **Authentication**: Email/password login via Supabase Auth.
- **Form Management & Validation**: React Hook Form + Zod for all input screens.
- **UI Components**: Accessible building blocks from shadcn/ui, styled with Tailwind CSS.
- **Dark/Light Theme**: Runtime theme switching via `next-themes`.
- **Error Handling**: Global boundary to catch sync and database errors, display user-friendly messages.

---

## 5. Tech Stack & Tools

**Frontend**
- React (v18) with Vite for fast builds and hot module reload.  
- TypeScript for type safety across components and services.  
- Tailwind CSS for utility-first styling.  
- shadcn/ui (based on Radix UI) for accessible, prebuilt components.  
- Framer Motion for smooth animations and transitions.  
- React Hook Form + Zod for form state management and schema validation.  
- TanStack Query for data fetching, caching, and background sync orchestration.  
- `next-themes` for dark/light mode support.

**Local Data Layer**
- `sql.js` (in-browser SQLite) or native SQLite library (desktop).  
- Custom hooks/services (`useLocalDB`, `useSync`) for database and sync logic.

**Backend & Sync**
- Supabase (PostgreSQL) for central data store and user authentication.  
- Supabase JS client for API communication.

**Testing & Development**
- Vitest for unit and integration tests (mock local DB and Supabase).  
- Storybook for isolated UI component development (optional).  
- VS Code with extensions for Tailwind CSS, TypeScript, and React.

---

## 6. Non-Functional Requirements

- **Performance**:  
  • Initial load time under 2 seconds.  
  • All cashier interactions sub-100 ms (optimistic writes to local DB).  
- **Offline Reliability**:  
  • Full offline operation, queuing changes locally until next sync.  
- **Sync Latency**:  
  • Background sync completes within 30 seconds of trigger.  
- **Security & Compliance**:  
  • Supabase credentials stored in environment variables.  
  • All API calls over HTTPS.  
  • Basic data privacy compliance (GDPR-ready data deletion on request).  
- **Usability & Accessibility**:  
  • Keyboard navigation for all interactive elements.  
  • ARIA tags on dialogs, forms, and status indicators.  
- **Scalability**:  
  • Support up to 10,000 product records in local DB without performance degradation.

---

## 7. Constraints & Assumptions

- **Network**: Assumes intermittent network; sync must handle offline and resume gracefully.  
- **Local Storage**: Browser environment limits local data size (~500 MB).  
- **Supabase Availability**: Requires Supabase service up and reachable for sync.  
- **Browsers**: Targets modern Chromium-based and Firefox browsers.  
- **User Volume**: Single cashier per terminal; concurrent edits only resolved at sync time.  
- **Conflict Strategy**: "Last write wins"—no manual merge UI in v1.

---

## 8. Known Issues & Potential Pitfalls

- **SQLite in Browser**: `sql.js` operates in memory by default. Persisting changes to IndexedDB or FileSystem API is required to avoid data loss on refresh.  
- **Sync Overhead**: Large batches may slow down the UI. Mitigate with Web Workers or batched operations.  
- **Conflict Resolution**: Simple strategy may overwrite newer data. Future versions may need manual conflict resolution UI.  
- **API Rate Limits**: Supabase free tier limits calls per second. Implement backoff and retry logic.  
- **Error Handling**: Network or DB failures must be surfaced clearly; avoid silent drops of records.  
- **Testing Complexity**: Mocking both local DB and Supabase interactions requires careful test setup in Vitest.

**Mitigation Suggestions**
- Use a Web Worker for sync tasks to keep the UI thread free.  
- Chunk large sync payloads into smaller batches.  
- Implement persistent storage layer on top of `sql.js` (e.g., save the database file to IndexedDB).  
- Add exponential backoff for failed sync attempts.  
- Write integration tests that simulate offline/online transitions.

---

With this PRD, the AI model has a clear, complete picture of the local-first cashier app. All core features, boundaries, and technical details are specified so follow-up technical documents (Tech Stack Document, Frontend Guidelines, Backend Structure, etc.) can be produced without further clarification.