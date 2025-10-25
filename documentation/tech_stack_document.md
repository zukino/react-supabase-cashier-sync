# Tech Stack Document

## Frontend Technologies

We chose a set of modern tools to deliver a fast, responsive, and accessible cashier interface that works offline and online:

- **React (v18)**
  • A popular library for building user interfaces with components and hooks.
  • Enables declarative rendering so the UI updates automatically when data changes.

- **Vite**
  • A build tool that starts up instantly and supports hot-module replacement (HMR).
  • Ensures lightning-fast development feedback loops and optimized production bundles.

- **TypeScript**
  • Adds static types on top of JavaScript, catching errors early and making the code more maintainable.

- **Tailwind CSS**
  • A utility-first CSS framework that speeds up styling by composing small, reusable classes.
  • Purges unused styles in production for smaller file sizes.

- **shadcn/ui + Radix UI**
  • A collection of accessible, customizable UI components (dialogs, buttons, inputs).
  • Ensures consistent styling and built-in keyboard accessibility.

- **next-themes**
  • Manages dark/light mode toggling to adapt the interface to different lighting conditions.

- **Framer Motion**
  • Provides smooth animations and transitions, improving perceived performance and user delight.

- **TanStack Query**
  • Handles data fetching, caching, and synchronization status in a declarative way.
  • Powers the background sync indicators (e.g., "Syncing...", "Last synced: 2 min ago").

- **React Hook Form + Zod**
  • Manages complex forms with minimal re-renders and simple APIs.
  • Validates input data against schemas before saving to the local database, preventing bad records.

- **Utility Libraries**
  • **date-fns** for reliable date formatting and calculations.
  • **Chart.js** (or **Recharts**) for sales dashboards and inventory reports.

This combination guarantees a snappy, accessible, and visually consistent POS interface that can operate even when offline.

## Backend Technologies

The backend stack provides both local-first persistence and a centralized online store for multi-terminal setups:

- **Local SQLite Database**
  • **sql.js** (in-browser SQLite) or native SQLite via **Tauri/Electron** for desktop builds.
  • Ensures transactions, inventory updates, and customer data are saved instantly on the device.
  • Supports offline operations and prevents data loss during connectivity issues.

- **Supabase**
  • Hosted PostgreSQL database for centralized data storage.
  • Built-in authentication (email/password, magic links, etc.) manages user access.
  • Real-time capabilities enable live updates across terminals.
  • REST and GraphQL-like APIs for syncing data changes.

- **Synchronization Service**
  • Custom logic running on a 5-minute timer (or via a **Web Worker**) to:
    - Read new/updated records from the local SQLite store.
    - Push changes to Supabase.
    - Fetch remote updates and merge them locally.
    - Handle conflict resolution (e.g., "last write wins" or custom merging).

Together, these components form a robust local-first architecture with a reliable sync bridge to the online backend.

## Infrastructure and Deployment

Our infrastructure choices focus on easy deployments, reliable versioning, and automated workflows:

- **Version Control: Git & GitHub**
  • Central repository for code collaboration and history tracking.

- **CI/CD: GitHub Actions**
  • Automates testing (Vitest), linting, and builds on every pull request or merge.
  • Deploys preview deployments for quick feedback.

- **Hosting: Vercel**
  • Seamless integration with Vite projects, automatic builds, and global CDN.
  • Environment variables (Supabase URL, keys) are managed securely in the dashboard.

- **Local Dev Environment**
  • Docker (optional) to replicate Supabase locally.
  • Environment files (.env) to configure local SQLite vs. production Supabase endpoints.

This setup ensures consistent, repeatable deployments and fast rollback capabilities.

## Third-Party Integrations

We leverage specialized services and libraries to extend functionality without reinventing the wheel:

- **Supabase**
  • Central database, auth, and real-time subscriptions.

- **Framer Motion**
  • High-performance animations for UI feedback.

- **date-fns** and **Chart.js**
  • Handling date calculations and rendering sales/inventory charts.

- **Radix UI & shadcn/ui**
  • Ready-made, accessible UI components that match the project’s design system.

- **Storybook** (recommended)
  • Tool for developing and testing UI components in isolation (optional but highly beneficial).

These integrations save development time and tap into mature, well-supported ecosystems.

## Security and Performance Considerations

We’ve implemented measures to protect data and maintain a smooth user experience:

- **Authentication & Authorization**
  • Managed by Supabase Auth (JWT tokens) for secure login flows.
  • Role-based policies in PostgreSQL to enforce data access rules.

- **Data Protection**
  • All network traffic uses HTTPS to encrypt data in transit.
  • Sensitive keys (Supabase service role keys) are never exposed to the browser.

- **Input Validation**
  • Zod schemas enforce data shapes before writes to SQLite or Supabase, reducing bad data.

- **Performance Optimizations**
  • Vite’s native ES module support and code-splitting for faster initial loads.
  • Tailwind’s purge mechanism removes unused CSS for minimal bundle sizes.
  • TanStack Query caches data and batches requests to avoid unnecessary network calls.
  • Offloading sync logic to a Web Worker to keep the UI thread responsive.

- **Error Handling**
  • Global error boundaries display user-friendly messages for sync failures or form errors.
  • Retry logic in the sync service handles transient network issues.

These practices ensure the app remains fast, reliable, and secure under various conditions.

## Conclusion and Overall Tech Stack Summary

By combining:

- A **modern React/Vite frontend** with accessible, theme-aware UI components.
- A **local-first SQLite database** for instant, offline-capable persistence.
- A **Supabase backend** for centralized storage, real-time updates, and secure authentication.
- **Automation and hosting** via GitHub Actions and Vercel for seamless deployments.
- **Quality and security** through TypeScript, Zod validation, HTTPS, and robust error handling.

We achieve a unique Point-of-Sale solution that:

- Runs offline without interruption.
- Syncs reliably every five minutes, keeping all terminals aligned.
- Delivers a polished, accessible cashier experience with fast interactions.

This tech stack aligns closely with the project goals, offering both developer efficiency and a superior end-user experience.