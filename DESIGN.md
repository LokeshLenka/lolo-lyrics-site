---
name: LOLOSYNC
description: Admin panel for live lyrics projection — logo-lit midnight surfaces with magenta and cyan neon accents.
colors:
  console: "#08070b"
  panel: "#100d16"
  raised: "#1a1421"
  hairline: "#f3e8ff18"
  hairline-strong: "#f3e8ff36"
  scrollbar-thumb: "#493252"
  scrollbar-thumb-hover: "#65446f"
  ink: "#f8f4fb"
  ink-muted: "#cec1d5"
  ink-faint: "#a394aa"
  brand-magenta: "#e040fc"
  brand-magenta-soft: "#e040fc26"
  brand-cyan: "#7fd7fd"
  brand-cyan-soft: "#7fd7fd24"
  brand-ink: "#08070b"
  signal-ok: "#7fd7fd"
  signal-warn: "#e040fc"
  signal-bad: "#ff5964"
  gradient-slate: "#020617"
  gradient-blue: "#172554"
  gradient-indigo: "#312e81"
  gradient-zinc: "#09090b"
  gradient-fuchsia: "#4a044e"
  gradient-pink: "#500724"
  gradient-gray: "#030712"
  gradient-amber: "#451a03"
  gradient-orange: "#431407"
  gradient-neutral: "#0a0a0a"
  gradient-violet: "#2e1065"
  gradient-purple: "#3b0764"
  gradient-stone: "#0c0a09"
  gradient-red: "#450a0a"
  gradient-rose: "#4c0519"
  gradient-emerald: "#022c22"
  gradient-teal: "#042f2e"
  gradient-cyan: "#083344"
typography:
  display:
    fontFamily: "Sora, Noto Sans Telugu, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 3.4vw, 2.75rem)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  wordmark:
    fontFamily: "Sora, Noto Sans Telugu, ui-sans-serif, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Sora, Noto Sans Telugu, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Sora, Noto Sans Telugu, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  body-sm:
    fontFamily: "Sora, Noto Sans Telugu, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  label:
    fontFamily: "Sora, Noto Sans Telugu, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "24px"
    letterSpacing: "normal"
  control:
    fontFamily: "Sora, Noto Sans Telugu, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  meta:
    fontFamily: "Sora, Noto Sans Telugu, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  readout:
    fontFamily: "IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
    fontFeature: "tabular-nums"
  micro:
    fontFamily: "IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  micro-label:
    fontFamily: "IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.14em"
rounded:
  md: "0px"
  xl: "0px"
  2xl: "0px"
  full: "0px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-lamp:
    backgroundColor: "{colors.brand-magenta}"
    textColor: "{colors.brand-ink}"
    typography: "{typography.control}"
    rounded: "0px"
    height: "40px"
    padding: "0 14px"
  button-quiet:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "0px"
    height: "40px"
    padding: "0 14px"
  button-danger:
    backgroundColor: "#ff59641a"
    textColor: "{colors.signal-bad}"
    typography: "{typography.control}"
    rounded: "0px"
    height: "48px"
    padding: "0 20px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    typography: "{typography.control}"
    rounded: "0px"
    height: "40px"
    padding: "0 12px"
  input:
    backgroundColor: "{colors.console}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "0px"
    height: "40px"
    padding: "0 12px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.ink-faint}"
    typography: "{typography.control}"
    rounded: "0px"
    height: "44px"
    padding: "0 12px"
  nav-item-active:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "0px"
    height: "44px"
    padding: "0 12px"
  stat-card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "0px"
    padding: "16px 20px"
    border: "1px solid {colors.hairline}"
  data-table:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "0px"
    border: "1px solid {colors.hairline}"
  row-picker:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "0px"
    padding: "12px 16px"
    border-bottom: "1px solid {colors.hairline}"
  transport-pill:
    backgroundColor: "{colors.console}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "0px"
    padding: "6px"
    border: "1px solid {colors.hairline}"
---

# Design System: LOLOSYNC

## Overview

**Creative North Star: "The Stage Manager's Desk"**

LOLOSYNC's admin is the desk of the person who calls the show and never appears on stage. Its dark control-room surfaces use square geometry, the logo's magenta/cyan neon, and clear live-state hierarchy. The Live workspace gives the operator a direct view of the room output, the current setlist, and the controls needed to advance it.

Density is deliberate but kind. Tables carry the working data with hairline rules and tabular mono counts; stat cards answer "how big is tonight" at a glance; the Live page is the only expressive surface, painting the now-playing song's own gradient under a dark wash — the console and the projection are visibly the same picture, which is the product's whole promise made visible.

Confirmed rejections: no second accent colour, no shadows on static surfaces, no decoration that competes with the live state, no card-grid dashboards of identical tiles — stat cards differ by content, tables differ by row.

**Key Characteristics:**
- Sidebar navigation with four sections — Dashboard, Events, Library, Live — and a sticky top bar carrying the Blackout lever alone.
- Stat cards answer size; tables carry the work; filters sit in one calm bar above every table.
- Cards on screens, ruled lists inside sheets — pickers and confirms are rows, never card grids.
- Logo-derived magenta marks primary actions, focus and selection; cyan marks live and connected states; red marks destructive and error states.
- Every stage state shown as colour **plus** a word (LIVE, STAGED, PLAYED, CONNECTED, BLACKOUT).
- Numbers set in tabular monospace: ordinals, counts, line counts.
- The live song's gradient is the only large field of colour, and only in the Live now-playing card.

## Colors

A near-black control room tinted by the logo's neon ring. Surfaces stay nearly black with a restrained violet cast; magenta and cyan light the interface by role, while red remains reserved for destructive and error states.

### Primary
- **Logo Magenta** (`#E040FC`): primary action, focus, active navigation, text caret, and selection. Black brand ink (`#08070B`) keeps text legible on bright magenta controls; soft magenta tints indicate selected surfaces.
- **Logo Cyan** (`#7FD7FD`): live and connected states, plus a restrained secondary light tint. State words remain visible beside every colored marker.
- **Logo Red** (`#D50100`): source hue for danger. Interface text uses the brighter accessible red (`#FF5964`) for destructive actions and errors.

### Neutral
- **Console** (`#08070B`): the page and recessed inputs.
- **Panel** (`#100D16`) and **Raised** (`#1A1421`): the surface ladder, held close to black with a violet undertone.
- **Hairlines** (`#F3E8FF18`, strong `#F3E8FF36`): tinted separators and borders.
- **Scrollbar** (`#493252`, hover `#65446F`): a muted violet rail that remains subordinate to content.
- **Ink** (`#F8F4FB`), **Ink Muted** (`#CEC1D5`), **Ink Faint** (`#A394AA`): high-contrast reading and metadata tones.

### Status signals
- **Signal Ok** (`#7FD7FD`), **Signal Warn** (`#E040FC`), **Signal Bad** (`#FF5964`): live/connected, staged, and destructive/error states. Never used decoratively.

### Audience gradients
Fourteen fixed three-stop gradients (`linear-gradient(135deg, …)`) live in `src/admin/types.ts` and are the only imagery the product has: each song owns one, the Live now-playing card shows it under a 45% black wash, and the audience screen shows it under 45%. They are content, not chrome — pick from the set, never invent a fifteenth, and never reuse one as a console background.

### Named Rules
**The Neon-by-Role Rule.** Magenta belongs to action, focus, and selection; cyan belongs to live and connected states; red belongs to destructive and error states. Never use these hues as interchangeable decoration.

**The Colour-Is-Never-Alone Rule.** No state is communicated by colour alone: every lamp carries a word (`LIVE`, `UP NEXT`, `SUNG`, `CONNECTED`, `BLACKOUT`) in the same colour, so the console still reads in greyscale or for a colour-blind operator. Picker membership uses a cyan tint plus a check icon (with screen-reader text), no word — it is a selection state, not a stage state.

## Typography

**Display / Body Font:** Sora (with Noto Sans Telugu as the script fallback, then `ui-sans-serif, system-ui`)
**Label / Mono Font:** IBM Plex Mono (with `ui-monospace, SFMono-Regular, Menlo`)

**Character:** Sora is geometric but humane — confident at display sizes, neutral at 13–15px. IBM Plex Mono is the instrument voice: everything the console *measures* is set in it, so counts and statuses separate from prose at a glance. Noto Sans Telugu sits directly behind Sora so romanised Telugu and any Telugu script both render without tofu.

### Hierarchy
- **Display** (600, `clamp(1.75rem, 3.4vw, 2.75rem)`, 1.08, `-0.025em`): the audience song title — the largest type in the product.
- **Wordmark** (700, 19px, 1.2, `-0.03em`): the LOLOSYNC mark in the sidebar and on the sign-in card.
- **Title** (600, 17px, 1.3, `-0.02em`): screen titles in the top bar, dialog and sheet headings.
- **Body** (400, 15px, 1.5): descriptions, helper copy, confirm-dialog text. Also the document default — unsized text is 15px.
- **Body small** (400, 16px): inputs, table titles, large button labels.
- **Label** (400, 15px, 24px): panel titles — the working size of section headings.
- **Control** (500, 15px): every button and nav item.
- **Meta** (400, 14px; ordinals set in mono): secondary labels, small inputs and buttons, table ordinals.
- **Readout** (mono 500, 11px, tabular figures): counts, line counts, dates, table facts.
- **Micro** (mono 500, 10px): key caps and the smallest counters.
- **Micro-label** (mono 500, 11px, uppercase, `0.14em`): lamps, filter labels, the wordmark line.

### Named Rules
**The Readout Rule.** Anything countable — song counts, lyric line counts, table ordinals, dates, stat values — is IBM Plex Mono with tabular figures so digits never shift the layout when they change.

## Layout

Sidebar shell: a fixed **sidebar** (`15rem`) on `sm` screens and up, and the **content column** filling the rest. The sidebar carries the wordmark, the four sections (Dashboard, Events, Library, Live), the connection lamp, and sign out. Below `sm` it becomes a top bar with the wordmark plus a horizontal chip nav. The sticky **top bar** carries the screen title and subtitle, page actions, and `Blackout stage` alone at the right edge (with its own confirm dialog) — session controls are nowhere near it.

The content column is `max-w-6xl` and reads top to bottom as: **notice** → **panels**.

- The **Dashboard** answers size first — stat cards (songs, events, lyric lines, live now) — then the room: an On-stage panel, recent events, newest songs.
- **Events** and **Library** share one rhythm: a filter bar (search, faceted filters, sort) above a hairline-ruled table. Expanding an event row manages its running order in place.
- **Live** is event picker plus transport pill plus on-stage/up-next panels plus the queue — everything a show needs on one screen.
- Spacing rhythm is the 4px scale (`4 / 8 / 12 / 16 / 24`), with 12–16px as the working step inside panels and 16–24px as the step between regions.

**Breakpoints:** `sm` 640px (sidebar appears, filters go multi-column), `lg` 1024px, `xl` 1280px (dashboard two-column panels).

## Elevation & Depth

Flat, full stop. Structure is carried by the surface ladder (console → panel → raised) and by hairlines, so panels sit *in* the desk rather than above it. Nothing in the admin casts a shadow — not tables, not dialogs, not sheets. Modals use a scrim rather than elevation to separate themselves.

### Named Rules
**The Flat Desk Rule.** Static surfaces never cast shadows, and neither do overlays: dialogs and sheets use a scrim rather than a shadow.

## Shapes

Square geometry throughout the product. Containers, controls, indicators, buttons, sheets, dialogs, and cards have zero corner radius. Use surface contrast, spacing, and hairline borders to distinguish areas.

- **All elements — 0px:** no rounded corners, including loading indicators and status lamps.
- Borders are 1px hairlines; keyboard focus uses a clear offset outline.

## Components

### Buttons
**Quiet until they matter.** One vocabulary, four intensities, three sizes.

- **Shape:** square corners on all buttons, heights 32 / 40 / 48px (`sm` / `md` / `lg`), 13px medium label.
- **Lamp (primary):** magenta fill `#E040FC` with `#08070B` text — used for primary actions such as `Go live`, `Create`, `New event`, and `New song`. Hover dims to 90%.
- **Quiet (default):** raised surface, hairline border; hover strengthens the border and softens the fill. Used for `Manage`, `Add songs`, `Keep it`.
- **Danger:** 10% `#FF5964` wash with a 35% border and `#FF5964` text — `Blackout stage`, `Delete song`, `Delete event`. Never a solid red fill.
- **Ghost:** no chrome until hovered — `Sign out`, `Clear all filters`.
- **Interaction:** 150ms colour transitions, `active: scale(0.985)` for physical press feedback, disabled at 40% opacity.

### Inputs / Fields
Recessed and quiet: console fill, hairline border, square corners, 40–44px tall, 11px uppercase mono labels above (`EVENT NAME`, `TITLE`, `LYRICS — ONE LINE PER ROW`). Date inputs render in the dark scheme. Focus shifts the border to magenta at 60% with a visible global focus outline. Errors appear as a bordered `#FF5964` strip under the field with `role="alert"`.

### Navigation
**Sidebar, not tabs.** Four sections — Dashboard, Events, Library, Live — in a fixed sidebar (`15rem`) with icon plus label; the active section takes a raised surface and a magenta icon. Below `sm` the sidebar becomes a top bar with horizontal chips. The wordmark returns home; sign out sits at the sidebar's foot, far from any show control.

### Tables / Filters
Tables are the working surface: hairline head rule with mono uppercase columns, hairline row rules, tabular mono facts, icon actions right-aligned. Above every table sits one filter bar — search plus faceted selects and ranges plus sort — with `Clear all filters` as the escape hatch and a live `N of M` subtitle so filtered views never feel empty by accident.

### Cards / Containers
Panels (`bg-panel`, hairline border, square corners) hold regions — stats, tables, transport, dialogs, sheets. Stat cards answer one number each and differ by content, never by decoration.

### Signature Components
- **Lamp:** a 6px dot plus an uppercase mono word in the same colour — the system's entire state vocabulary (`LIVE`, `STAGED`, `PLAYED`, `CONNECTED`, `BLACKOUT`). The dot pulses only while something is genuinely live.
- **Stat card:** one number each — label in mono uppercase, value in 28px semibold, one hint line. Songs, events, lyric lines, live now.
- **Live transport:** a square console control group holding previous, go-live/next, next — the show's three moves in one thumb-sized cluster.
- **Queue cards:** three cards per row on wide screens, two at medium sizes, and one on phones. The queue heading pairs the song count with Add songs. Each card shows `NN. Song title`, live/staged/played state, lyric-line count, a dedicated top-right drag handle, and remove control. Clicking the card stages its song; keyboard users can reorder a focused card with Alt + arrow keys. Queue additions are inserted at the top, live changes require staging before the single Push to live action, and removing a song requires confirmation. Clearing the staged choice leaves the current live song on screen; blackout returns audience screens to Awaiting Signal without removing the song from the queue.
- **Add-songs sheet:** a right-side sheet (edge-to-edge on mobile) holding the library as ruled rows — title plus `+ Add`; songs already in the order sit on a green tint with a check instead. Own search, tap adds in place, the sheet stays open for the next pick. Dismisses by scrim tap, Esc, or close.
- **Now-playing card:** the live song's own gradient behind a 45% black wash, with a `LIVE` lamp and the title — the one place the admin is allowed to be loud.

## Do's and Don'ts

### Do:
- **Do** reserve `#E040FC` for primary actions and focus, `#7FD7FD` for live/connected status, and `#FF5964` for danger.
- **Do** pair every coloured stage state with its word, in the same colour.
- **Do** set counts, ordinals and line totals in IBM Plex Mono with tabular figures.
- **Do** separate regions with 1px hairlines (`#ffffff14`) on the surface ladder.
- **Do** confirm destructive actions with the exact question and honest buttons (`Keep it` / `Delete song`, `Delete event`).
- **Do** keep table actions reachable by keyboard everywhere, and tables horizontally scrollable below their minimum width.
- **Do** let sheets dismiss by scrim tap, Esc, or close — never strand the operator behind an overlay.
- **Do** honour `prefers-reduced-motion`: all durations collapse and pulses stop.

### Don't:
- **Don't** use the logo hues interchangeably or add unrelated accent colors.
- **Don't** state a stage status with colour alone — no bare coloured dots.
- **Don't** put shadows anywhere in the admin; overlays use a scrim rather than elevation.
- **Don't** use the song gradients as general decoration — only in the Live now-playing card (45% black wash) and on the audience screen (45% black wash).
- **Don't** add corner rounding anywhere; all product UI geometry is square.
- **Don't** put controls in the audience view — it has no chrome at all, and keeps `@ SRKR LOLO` verbatim.
