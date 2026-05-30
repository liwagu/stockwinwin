# Design - StockWin

A locked design system for this app. Every page redesign reads this file before
emitting code. Do not regenerate per page; extend or amend this file when the
system needs to grow.

## Genre

modern-minimal

## Macrostructure Family

- Marketing pages: Workbench. Product evidence comes first: live market desk, model status, chart preview, and pricing.
- App pages: Workbench. Dense operational surfaces, compact controls, tabular metrics, and charts without decorative framing.
- Content pages: Long Document. Legal and policy pages read as quiet documents with one column, generous measure, and no marketing chrome.

## Theme

- `--color-paper` oklch(97% 0.006 250)
- `--color-paper-2` oklch(94% 0.008 250)
- `--color-ink` oklch(18% 0.012 250)
- `--color-ink-2` oklch(42% 0.012 250)
- `--color-rule` oklch(84% 0.010 250)
- `--color-accent` oklch(52% 0.16 205)
- `--color-focus` oklch(61% 0.18 205)

## Typography

- Display: Geist, weight 650, normal
- Body: Geist, weight 400
- Mono: Geist Mono, weight 500
- Wordmark: Fraunces/Cormorant register may be used for the StockWin mark only
- Display tracking: -0.03em
- Type scale anchor: `--text-display = clamp(2.75rem, 5vw + 1rem, 5.25rem)`

## Spacing

4-point named scale. The values are in `tokens.css`. Pages use named tokens
through shared CSS classes; component-local raw spacing is allowed only for
layout glue that maps to the same scale.

## Motion

- Easings: `--ease-out`, `--ease-in`, `--ease-in-out`
- Reveal pattern: none for app pages; light opacity/translate for marketing only
- Reduced motion: opacity-only, 150 ms maximum

## Microinteractions Stance

- Silent success. No celebratory loops except existing post-checkout overlay.
- Hover: small transform only; no coloured glow.
- Focus: immediate visible ring using `--color-focus`.
- Loading: functional spinner/skeleton only.

## CTA Voice

- Primary CTA: ink-filled pill, short verb phrase.
- Secondary CTA: outlined pill, same dimensions, no gradient.
- Destructive or warning states use text plus icon, never colour alone.

## Per-page Allowances

- Marketing pages may use one lightweight product mockup built from real live UI.
- App pages must not use decorative background art.
- Content pages are typography only.

## What Pages Must Share

- The wordmark and logo placement.
- The cool-neutral paper/ink system and one blue accent.
- Geist as body/display; Geist Mono only for data, symbols, and timestamps.
- 8 px card radius, 999 px pill radius, hairline borders, no nested cards.
- Buttons are pill or compact rectangular depending on context, never gradient-filled.

## What Pages May Differ On

- Marketing pages can use larger display type and a floating pill nav.
- Dashboard pages can use denser tables and segmented controls.
- Legal pages can remove product chrome and read as long documents.

## Exports

### tokens.css

See `tokens.css` at the project root.

### Tailwind v4

`app/globals.css` imports `tokens.css`, then maps the tokens through `@theme inline`
so utilities like `bg-background`, `text-foreground`, `border-border`, and
`font-sans` resolve to the same system.

### shadcn/ui CSS Variables

The shadcn-compatible variables are set in `app/globals.css`:

- `--background` = `--color-paper`
- `--foreground` = `--color-ink`
- `--card` = `--color-elevated`
- `--border` = `--color-rule`
- `--ring` = `--color-focus`

### DTCG Mapping

- `color.background.default` = `--color-paper`
- `color.background.subtle` = `--color-paper-2`
- `color.surface.default` = `--color-elevated`
- `color.text.default` = `--color-ink`
- `color.text.muted` = `--color-ink-2`
- `color.border.default` = `--color-rule`
- `color.action.primary` = `--color-accent`
