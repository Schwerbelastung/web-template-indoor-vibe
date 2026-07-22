# CLAUDE.md — session bootstrap

Indoor bike rental & sale marketplace built on the Sharetribe Web Template (v12), pair-programmed
with **Vesa** (non-developer, Windows 11 + PowerShell). Explain things in plain language.

**Start every session by reading `BUILD-PLAN.md` (the full phase plan + working rules) and
`PROGRESS.md` (current phase + how to resume). Follow the code conventions in `AGENTS.md`.**

Quick facts:

- Phases are gated: never start a phase, and never commit, without Vesa's explicit approval.
- Tests every phase: `$env:CI="true"; yarn test` (PowerShell syntax) and `yarn run test:e2e`
  (Playwright, added in Phase 1). Report results honestly before asking for approval.
- Secrets: Vesa runs `yarn run config` / edits `.env` himself. Never print or commit secrets.
- Local Sharetribe docs mirror: `..\dev-docs-main\dev-docs-main\content\<path>\index.mdx`
  (relative to this repo root) = `https://www.sharetribe.com/docs/<path>/`. Read these first.
- Git: commit to `main`, push to `origin` only. Never push to `upstream` (sharetribe/web-template).
- Hosted Console assets override local config. Console changes are Vesa's tasks — print exact
  steps as "YOUR TASKS (in Console)" and wait for his confirmation.
- Use PowerShell-compatible commands only (e.g. `$env:CI="true"; yarn test`, never `CI=true ...`).
