# Frontend Guideline Document – react-supabase-cashier-sync

This document outlines the frontend setup, architecture, design principles, and technologies for the **react-supabase-cashier-sync** project. It is written in everyday language to make sure anyone can follow along without a deep technical background.

---

## 1. Frontend Architecture

### Frameworks and Libraries Used
- **React v18** with **TypeScript** for a component-based, type-safe UI.
- **Vite** as the build tool for lightning-fast startup and hot module replacement.
- **Tailwind CSS** for utility-first styling.
- **shadcn/ui** (built on **Radix UI**) for accessible, ready-made components.
- **TanStack Query** for data fetching, caching, and background sync status.
- **React Hook Form** + **Zod** for forms and schema validation.
- **Framer Motion** for smooth UI animations.
- **Supabase** as the online backend (PostgreSQL, auth, real-time).
- **sql.js** or **IndexedDB** (in browser) / native **SQLite** (in desktop via Tauri/Electron) for the local database.
- **next-themes** for dark/light mode toggling.
- (Optional) **React Router v6** for multi-page navigation.

### Scalability, Maintainability, Performance
- **Component-based design** keeps UI pieces small and reusable.
- **TypeScript** prevents many bugs up front and makes it safer to grow the codebase.
- **Vite** ensures fast rebuilds as you add more files.
- **TanStack Query** handles caching and background updates automatically, reducing custom code.
- **Modular folders** (`components/`, `hooks/`, `services/`, `lib/`) separate UI, logic, and data layers.

---

## 2. Design Principles

1. **Usability**: Simple, clear layouts; prominent buttons for core cashier actions; minimal distractions.
2. **Accessibility**: shadcn/ui and Radix UI components come with built-in ARIA support, keyboard navigation, and focus management.
3. **Responsiveness**: Tailwind’s utility classes (`sm:`, `md:`, `lg:`) ensure the app works on tablets, desktops, and touch-screen POS devices.
4. **Consistency**: Standardized components for dialogs, tables, forms, and status indicators.
5. **Feedback**: Visual cues (loading spinners, success/error states) during sync, form submit, or data fetch operations.

**How It’s Applied**
- Button sizes and touch targets meet WCAG 2.1 guidelines.
- Form fields highlight errors immediately, with clear messages.
- Sync status appears in a consistent corner of the screen.

---

## 3. Styling and Theming

### Styling Approach
- **Tailwind CSS** (utility-first): write classes right in JSX (e.g., `px-4 py-2 bg-primary text-white`).
- No separate CSS files—styles live alongside components for clarity.

### Theming
- **next-themes** manages `light` and `dark` modes.
- Tailwind’s `dark:` variant customizes colors automatically based on the selected theme.

### Visual Style
- **Modern flat design** with subtle glassmorphism touches on modals and status cards.
- Clean lines, minimal shadows, and smooth animations via Framer Motion.

### Color Palette
- **Primary:** #1ABC9C (teal)  
- **Secondary:** #2C3E50 (dark blue-gray)  
- **Accent:** #F39C12 (orange)  
- **Neutral Light:** #F5F7FA  
- **Neutral Dark:** #2E343B  
- **Error:** #E74C3C (red)  
- **Success:** #27AE60 (green)

### Typography
- **Font Family:** Inter (sans-serif) for readability and modern feel.
- **Font Sizes:** 16px base; scale up for headings (e.g., 24px for H2, 32px for H1).

---

## 4. Component Structure

### Organization
```
src/
 ├─ components/      # Reusable UI pieces (Button, Dialog, SyncStatus)
 ├─ hooks/           # Custom hooks (useSync, useLocalDB)
 ├─ services/        # Business logic (local-db.ts, sync.ts)
 ├─ lib/             # Utilities (cn, date helpers)
 └─ App.tsx, main.tsx # Entry points
```

### Reuse and Maintainability
- Each component lives in its own folder with `index.tsx` and optional `styles.ts`.
- Shared UI elements (cards, tables, forms) imported from **shadcn/ui** to avoid reinventing the wheel.
- Custom variants wrapped in your own `<Button>` or `<Input>` to enforce consistent props and styles.

**Why Component-Based Matters**
- Fix or update one small piece without touching the rest of the app.
- Easy to test components in isolation (e.g., with Storybook).
- Clear boundaries between UI, logic, and data.

---

## 5. State Management

- **TanStack Query** for server and sync state: fetch, cache, refetch, and track `isLoading`, `isError`, `isFetching`.
- **React Context** (or **Zustand/Jotai**) for global UI state like `theme`, `isOffline`, or `lastSyncTime`.
- **Local state** inside forms managed by **React Hook Form**.

**Data Flow**
1. Component calls `useQuery('products', fetchProducts)` to display inventory.
2. On sale, `useMutation(addSale)` writes to local DB immediately, then triggers background sync.
3. `useSync` hook (running every 5 minutes) pushes and pulls changes via Supabase API.
4. Sync status updates a React Context, which drives a `<SyncStatusIndicator />`.

---

## 6. Routing and Navigation

- **(Optional) React Router v6** for multiple screens (e.g., `/sell`, `/inventory`, `/reports`).
- In `App.tsx`, wrap content in `<BrowserRouter>` and define `<Routes>`:
  ```jsx
  <Routes>
    <Route path="/sell" element={<SalesScreen />} />
    <Route path="/inventory" element={<InventoryScreen />} />
    <Route path="/reports" element={<ReportsScreen />} />
  </Routes>
  ```
- **Menu component** with `<NavLink>` to highlight the current section.

If you prefer a single-page layout, use conditional rendering based on a `currentView` state in a context or store.

---

## 7. Performance Optimization

- **Code Splitting**: Lazy-load less-used screens (`React.lazy` + `Suspense`).
- **Image & Asset Optimization**: Use optimized formats (WebP); serve responsive sizes.
- **Tailwind Purge**: Remove unused CSS classes in production builds.
- **Memoization**: `React.memo`, `useMemo`, `useCallback` for expensive computations or large lists.
- **Web Workers** (optional): Run sync logic off the main thread to keep UI responsive.

These measures ensure fast load times, smooth interactions, and a snappy cashier experience even under heavy use.

---

## 8. Testing and Quality Assurance

### Testing Strategies
1. **Unit Tests** with **Vitest** for individual functions (e.g., date utils, sync helpers).
2. **Component Tests** (React Testing Library) to verify rendering, props, and user interactions.
3. **Integration Tests** to simulate multi-step flows (e.g., form fill → local save → sync).
4. **End-to-End Tests** with **Playwright** or **Cypress** to cover real user journeys, including offline mode and conflict scenarios.

### Tools & Frameworks
- **Vitest**: Fast, Vite-native unit testing.
- **Testing Library**: DOM testing for React components.
- **Cypress / Playwright**: Full-browser tests for checkout workflows.
- **Storybook** (optional): Visual testing & documentation of UI components.

Enforce a **CI pipeline** to run tests on every push, ensuring regressions are caught early.

---

## 9. Conclusion and Overall Frontend Summary

This guideline lays out a clear path to build and maintain a modern, local-first cashier application:

- A **React + Vite** foundation with **TypeScript** for safety and speed.
- **Tailwind CSS** + **shadcn/ui** for a consistent, responsive, and accessible look.
- **Local SQLite** persistence paired with a **5-minute Supabase sync** for offline-first reliability.
- **TanStack Query**, **React Hook Form**, and **Zod** to manage data, forms, and validation cleanly.
- **Performance optimizations** and **testing strategies** to keep the cashier experience smooth and bug-free.

Together, these pieces ensure your cashier app is fast, scalable, and easy to extend—whether you need extra terminals, new reports, or more complex sync logic in the future.

Happy coding!