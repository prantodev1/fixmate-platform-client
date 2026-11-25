# AGENTS.md

Guidance for AI agents working in this repository.

## Project Overview

FixMate Platform Client is the **Next.js 16 (App Router) frontend** for an on-demand device/home-appliance repair platform. It contains public marketing pages (home, about, services, contact), auth pages, and role-based dashboards for **customer**, **technician**, and **admin** users.

- Backend is a **separate API service** (defaults to `http://localhost:5000`). This repo makes no server-side DB calls at runtime.
- Plain **JavaScript/JSX** only — there is no TypeScript. Do not introduce `.ts`/`.tsx` files or type annotations.
- Styling is **Tailwind CSS v4** (configured through the Turbopack loader, not PostCSS).
- Icons: `lucide-react`. Toasts: `sonner`. Google login: `@react-oauth/google`.

## Commands

```bash
npm run dev      # next dev (Turbopack)
npm run build    # next build
npm run lint     # eslint (flat config, eslint-config-next core-web-vitals)
npm run start    # serve production build
```

There is **no test suite** in this repo. Validate changes with `npm run lint` and `npm run build`.

`react-hooks/set-state-in-effect` is configured as a **warning**: components hydrate from `localStorage` and fetch API data inside mount effects, which is intentional here.

## Environment Variables

Create `.env` (gitignored; see `.gitignore`) with:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Backend base URL, default `http://localhost:5000` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID for sign-in/sign-up |
| `NEXT_PUBLIC_IMGBB_API_KEY` | Image hosting key for avatar/service image uploads |
| `NEXT_PUBLIC_BKASH_MERCHANT_NUMBER` | Merchant number shown in the bKash payment flow |
| `NEXT_PUBLIC_NAGAD_MERCHANT_NUMBER` | Merchant number shown in the Nagad payment flow |

## Architecture

```
src/
├── app/                    # App Router routes
│   ├── layout.js           # Root layout: fonts, ThemeProvider, Toaster, LayoutWrapper
│   ├── page.js             # Home
│   ├── about|contact|services|sign-in|sign-up/
│   ├── services/[id]/      # Dynamic service detail + booking flow
│   ├── dashboard/
│   │   ├── layout.js       # Client-side auth guard + sidebar/topbar shell
│   │   ├── admin|technician|customer/...  # Role dashboards
│   │   └── profile/        # Shared profile page
│   ├── error.jsx, not-found.jsx, loading.js
│   └── globals.css         # Tailwind import + theme tokens/custom dark variant
├── components/
│   ├── Navbar.jsx, Footer.jsx, LayoutWrapper.jsx, ThemeProvider.jsx
│   ├── home|about|contact|services/   # Page-section components
│   ├── overviews/          # AdminOverview, TechnicianOverview, CustomerOverview, DashboardOverviewClient
│   ├── auth/               # GoogleAuthButton (only mounted when a Google client ID exists)
│   └── ui/                 # ConfirmModal, LoadingState skeletons/spinner
└── utils/
    ├── auth.js             # Role paths, localStorage session helpers
    └── generateInvoicePdf.js  # Printable invoice generation
```

### Key mechanics

- **Import alias:** `@/*` → `src/*` (`jsconfig.json`).
- **Layout switching:** `LayoutWrapper` renders `Navbar` + `Footer` for public routes and bare `children` for `/dashboard/*`.
- **Auth is client-side only:** token/user live in `localStorage` (`token`, `authToken`, `accessToken`, `user`). `src/utils/auth.js` has helpers; `window.dispatchEvent(new Event("auth-change"))` notifies listeners. `dashboard/layout.js` redirects unauthenticated users to `/sign-in`, sends users to their role home, and blocks cross-role paths. `/dashboard/profile` is allowed for all roles.
- **Roles:** normalized to lowercase `customer` | `technician` | `admin`. Role dashboards: `/dashboard/customer`, `/dashboard/technician`, `/dashboard/admin`.
- **Theme:** `ThemeProvider` toggles `light`/`dark` classes plus `data-theme` and `color-scheme` on `<html>`, persisting to `fixmate_theme`. A blocking inline script in `src/app/layout.js` prevents theme flash. Dark variant is declared in `globals.css` (`@custom-variant dark`). Use Tailwind's `dark:` utilities with the standard slate/sky palette.
- **Data fetching:** client components call the backend directly, e.g. `fetch(`${apiUrl}/api/...`)` with `process.env.NEXT_PUBLIC_API_URL`, `cache: "no-store"`, and `Authorization: Bearer ${token}`. Responses are usually read as JSON and handled as `data.data` or arrays. Each page defines its own small helpers (`getAuthToken`, `readStoredUser`, formatters) — that duplication is intentional, not a shared library.
- **Invoices:** `downloadPaidInvoice` / `generateInvoicePdf.js` produce HTML for print/PDF; keep escaping in mind when editing.
- **Next config** (`next.config.mjs`) enables `cacheComponents`, `partialPrefetching`, `reactCompiler`, and the Tailwind Turbopack rule. Changes to caching behavior should respect `cacheComponents` and the `Suspense` boundaries already present.

## Conventions

- Every interactive page/component starts with `"use client"`; only `app/layout.js` and static metadata are server-side.
- Default-export pages and top-level components; named exports for helpers/skeletons (e.g. `LoadingState.jsx`).
- Component files: PascalCase `.jsx`; route files: lowercase `page.js`/`layout.js`/`loading.js`.
- Style: double quotes, semicolons, 2-space indentation, trailing commas, arrow functions, early returns, optional chaining (`?.`) and nullish coalescing (`??`).
- UI patterns: rounded cards (`rounded-2xl`/`rounded-3xl`), slate neutrals with sky accents, `shadow-xs`, responsive mobile-first layouts, accessible labels on icon buttons, `max-w-7xl` containers.
- Loading/empty/error states: use `FixMateSpinner`, `PublicPageSkeleton`, `DashboardPageSkeleton` from `@/components/ui/LoadingState`; confirm destructive actions with `ConfirmModal`; report outcomes with `toast` from `sonner`.
- Validate all user/API-derived data defensively (arrays may be nested under `data.data`, values may be missing) and avoid `new Date()` formatting differences — the codebase uses `toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })`.
- Use `<img>` for remote user-uploaded avatars/images (with `onError` fallbacks); `next/image` is not used because image hosts are dynamic.

## Gotchas

- Do not move auth checks server-side without also porting the localStorage session; the app assumes a client-rendered dashboard shell.
- Avoid adding a second theme mechanism or CSS variables outside `globals.css`.
- Keep public routes wrapped so `LayoutWrapper` can decide the chrome; don't render `Navbar`/`Footer` inside individual pages.
- Google sign-in must stay behind `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: `GoogleAuthButton` (and its `useGoogleLogin` hook) is rendered only when the ID exists, and `GoogleOAuthProvider` is skipped otherwise. Calling the hook with an empty ID crashes the error boundary (`Missing required parameter client_id`).
- Hard-coded demo credentials exist on `/sign-in` for reviewers — leave them unless asked.
- `node_modules` contains unrelated `AGENTS.md` files; ignore those.
