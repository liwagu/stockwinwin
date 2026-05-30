# StockWin Cleanup Contract

Date: 2026-05-30

## Canonical Source

`/Users/guliwa/_code/stockwin` is the canonical product repository.

The Paper Desk game worktree remains a prototype source, but its source-worthy files have been copied into:

```text
prototypes/paper-desk-game/
```

## Cleanup Rules

- Do not copy local agent state into source control.
- Do not commit screenshots unless they are product assets required by the app.
- Do not commit real `.env` values. Tracked env files in this repo are placeholders only.
- Treat `stockwin-space` as a separate Hugging Face deployment archive until its remote credential is removed and rotated.
- Treat `stockwin-us-stocks` as disposable after one final human sanity check because it has no unique local commits compared with `dev`.

## Required Secret Follow-Up

Real credentials were present in tracked env files before this cleanup. The working tree now uses placeholders, but history and any deployed systems may still contain exposed values.

Rotate these credential classes outside the repo:

- Supabase service role keys.
- Stripe secret and webhook keys.
- Stripe price or portal IDs if they should not be public.
- Hugging Face token embedded in the `stockwin-space` remote URL.

Do not paste rotated values into chat, docs, commits, or logs.
