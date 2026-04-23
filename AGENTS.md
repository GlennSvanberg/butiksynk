Everything on this website is written in Swedish, it is targeting the swedish market only

## What this is

**Butiksynk** is a **PIM** (Product Information Management) product for **second-hand and vintage shops**. It solves unique-SKU chaos across channels: double sales, messy ops, and **VMB** (margin taxation) bookkeeping. The idea is a **digital twin** of shop inventory—**real-time stock sync**, AI-assisted listing, and a **kill-switch** that pulls listings the moment something sells in-store.

Stack: **TanStack Start** (SSR + admin UX) and **Convex** (backend + realtime database). Other integrations (OpenAI, image tooling, Swish, etc.) appear in product docs as they land.

## Where to look

- **Visual and UX rules:** `[DESIGNGUIDELINES.md](./DESIGNGUIDELINES.md)` — “Utilitarian Heritage,” palette (deep forest, terracotta accent, paper background), typography (Plus Jakarta Sans / Inter / JetBrains Mono for data), cards and buttons.
- **Convex patterns:** `.cursor/rules/convex_rules.mdc` and Convex skills/rules in the workspace.

## Defaults for changes

- Match existing patterns; keep diffs focused on the task.
- Prefer Convex queries/mutations/actions with proper validation and auth where applicable.
- UI should stay fast, precise, and on-brand per `DESIGNGUIDELINES.md`—no decorative fluff.

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.