# service-app

Staff portal for **Lifecycle & Traceability ERP** (BD Team, Operations, Factory and Admin). It talks only to `cyn-server`; the customer-facing portal is a separate app (`customer-app`).

**Stack:** Next.js 16 (App Router), JavaScript, CSS Modules.

> This Next.js version has breaking changes from older releases. Read the guides in `node_modules/next/dist/docs/` before changing framework-level code.

## Setup

```bash
yarn install
echo "API_URL=http://localhost:4100" > .env.local
yarn dev
```

The app runs on port `4102`. `cyn-server` must be running and must list this origin in its `CORS_ORIGIN`.

## Environment variables

| Variable | Purpose |
|---|---|
| `API_URL` | Base URL of `cyn-server` (server-side only, never sent to the browser) |

## Scripts

| Command | What it does |
|---|---|
| `yarn dev` | Development server on port 4102 |
| `yarn build` / `yarn start` | Production build and server |
| `yarn lint` | ESLint |

## Structure

```
app/
  login/                 sign-in page
  actions/               Server Actions (the only code that calls the API with a session)
  (app)/                 signed-in area with the sidebar shell
    page.js              dashboard (KPIs, order pipeline, recent orders, Admin approvals)
    purchase-orders/     PO list, new, detail, edit, inspection, quotation
    quotations/          Admin approval queue
components/              shared UI (shell, sidebar, PO header, PO form, inspection and quotation screens)
  ui.module.css         shared buttons, inputs, cards, alerts, tables and pills
lib/                     session, data-access layer, API helpers, constants
proxy.js                 redirects signed-out visitors to /login
```

## Styling conventions

- Brand colours, spacing, radii and shadows are CSS variables in `app/globals.css`; use them instead of hard-coded values.
- Buttons, form controls, cards, alerts, tables and pills live in `components/ui.module.css`. A screen's own stylesheet pulls them in with `composes: btn from "@/components/ui.module.css"` and only adds layout, so every screen looks the same.
- Icons are in `components/Icon.js`; add a glyph there before using a new name.
- Layouts are responsive down to phone width: the sidebar becomes a drawer below 960px.

## How auth works

- Signing in stores the backend's JWT in an **httpOnly cookie**, so page scripts can never read it.
- `proxy.js` is only a fast redirect for signed-out visitors. The real check is `lib/dal.js` (`verifySession`, `requireRole`), which validates the session with the backend; every page and Server Action calls it.
- This portal is for staff only: Customer accounts are refused at login.
- New screens are added to the sidebar in `lib/nav.js`, and to a PO's tabs in `components/PoHeader.js`.
