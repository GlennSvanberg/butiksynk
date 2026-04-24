Everything on this website is written in Swedish, it is targeting the swedish market only

Never ever run the dev server. user always has one terminal running with npm run dev

## What this is

**Selio** is a **PIM** (Product Information Management) product for **second-hand and vintage shops**. It solves unique-SKU chaos across channels: double sales, messy ops, and **VMB** (margin taxation) bookkeeping. The idea is a **digital twin** of shop inventory—**real-time stock sync**, AI-assisted listing, and a **kill-switch** that pulls listings the moment something sells in-store.

## Terminologi och vägar

- Produktnamnet är **Selio**. Använd inte det gamla namnet Butiksynk i UI, dokumentation, metadata, paketnamn eller nya tekniska nycklar.
- Skriv alltid UI på svenska. Målgruppen är svenska second hand- och vintagebutiker.
- Använd **vara** / **varor** för unika lagerobjekt i användargränssnittet. Undvik att blanda med produkt, artikel eller item i synliga texter.
- Primära appvägar:
  - **Varor:** `/app/varor`
  - **Ny vara:** `/app/varor/ny`
  - **Redigera vara:** `/app/varor/$productId/redigera`
  - **Kundbutik:** `/butik/$shopSlug`
  - **Publik vara:** `/butik/$shopSlug/vara/$productId`
- Inloggad startsida kan fortfarande ligga på `/app` (översikt); nya länkar och knappar för lager ska peka på `/app/varor...`.
- Använd **verktyget** hellre än **admin** i synliga texter när det syftar på butikens arbetsyta.

Stack: **TanStack Start** (SSR + admin UX) and **Convex** (backend + realtime database). Other integrations (OpenAI, image tooling, Swish, etc.) appear in product docs as they land.

## Where to look

- **Visual and UX rules:** `[DESIGNGUIDELINES.md](./DESIGNGUIDELINES.md)` — “Utilitarian Heritage,” palette (deep forest, terracotta accent, paper background), typography (Plus Jakarta Sans / Inter / JetBrains Mono for data), cards and buttons.
- **Convex patterns:** `.cursor/rules/convex_rules.mdc` and Convex skills/rules in the workspace.

## Borttagning (standard)

- **Ingen omedelbar hård borttagning** av användardata: använd **mjuk borttagning** (`deletedAt` tidsstämpel i ms, fältet utelämnat = aktiv rad).
- **Rensning i bakgrunden** efter **14 dagar** rensar jobbet bort rader (och tillhörande lagring där det är relevant). Konstant: `shared/retention.ts` (`SOFT_DELETE_RETENTION_DAYS` / `softDeleteRetentionMs()`), cron i `convex/crons.ts`.
- Nya tabeller ska följa samma mönster om de behöver borttagning.

## Bekräftelsedialog (UI)

- Använd **inte** `window.confirm` / `window.alert` för steg i appen. Använd istället **`useConfirm` från `~/lib/confirm`**, i kombination med **`<ConfirmProvider>`** (redan inbäddad i `src/router.tsx` under `ShopSessionProvider`).
- Samma märke, typografi och knapplayout (mörkgrön primär, **terracotta** för destruktiva händelser via `variant: 'danger'`) så bekräftelser upplevs enhetliga. API: `const confirm = useConfirm();` sedan `if (!(await confirm({ title, description, ... }))) return;`.
- Utöka stilar bara i `src/lib/confirm.tsx` så allt nya följer samma nivå.

## Defaults for changes

- Match existing patterns; keep diffs focused on the task.
- Prefer Convex queries/mutations/actions with proper validation and auth where applicable.
- UI should stay fast, precise, and on-brand per `DESIGNGUIDELINES.md`—no decorative fluff.
- **New UI:** Prefer **[shadcn/ui](https://ui.shadcn.com)** for components (add via `npx shadcn@latest add <component>` once the project is initialized). Compose with Tailwind; keep **colors, type, and tone** aligned with `DESIGNGUIDELINES.md`—theme or extend shadcn tokens/CSS variables to match the brand. Existing routes that predate shadcn can stay as-is until you change them for other reasons; then optionally adopt shadcn primitives for consistency.

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.