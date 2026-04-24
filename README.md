# Selio

**Selio** is a **PIM** (Product Information Management) product aimed at **second-hand and vintage shops** in Sweden. It helps with unique-SKU inventory across channels: fewer double sales, smoother operations, and support for **VMB** (margin taxation) workflows. The product centers on a **digital twin** of shop inventory—real-time stock sync, AI-assisted listing, and the ability to pull listings as soon as something sells in-store.

The customer-facing app is built in **Swedish** for the Swedish market.

## Stack

- **[TanStack Start](https://tanstack.com/start)** — full-stack React with SSR
- **[Convex](https://convex.dev)** — backend, database, and realtime updates
- **Vite**, **TypeScript**, **Tailwind CSS**, **shadcn/ui**

## Prerequisites

- **Node.js** (current LTS recommended)
- **npm** (this repo uses `package-lock.json`)

## Setup

1. Clone the repository and install dependencies:

   ```bash
   git clone <repository-url>
   cd selio
   npm install
   ```

2. **Convex** — the dev script runs Convex alongside the frontend. On first run, sign in or link a deployment when prompted:

   ```bash
   npx convex dev
   ```

   Configure any required environment variables and secrets in the [Convex dashboard](https://dashboard.convex.dev) for your deployment, and add local frontend env files (for example `.env.local`) if the app expects a public Convex URL or other keys—see project docs or `AGENTS.md` for integration details.

## Run locally

Start the Convex dev server and the Vite dev server together (default app port **3000**):

```bash
npm run dev
```

## Build and production start

```bash
npm run build
npm start
```

`npm start` runs the built TanStack Start server from `.output/server/index.mjs` (build first).

## Other scripts

| Command        | Description                                      |
| -------------- | ------------------------------------------------ |
| `npm run lint` | Typecheck and ESLint                             |
| `npm run format` | Format with Prettier                           |

## More in the repo

- **`AGENTS.md`** — product context, stack notes, and conventions for contributors
- **`DESIGNGUIDELINES.md`** — visual and UX direction (“Utilitarian Heritage”)
