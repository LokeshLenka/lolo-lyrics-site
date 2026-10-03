# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary — worship service operator (admin role).** One person at a laptop, phone or tablet running a live Telugu-language church service. They are usually standing, often mid-song, and cannot afford to hunt for a control. Their job during a service: know what is on screen right now, stage the next song, push it live, reorder the setlist between songs, and black the stage out. Confirmed by the product's own shape: Supabase auth plus a `profiles.role = 'admin'` gate, a single-row `live_state` table, and a `set_live_song` RPC.
- **Secondary — the congregation.** Not a user of the software: they read the audience screen (any non-`/admin` path) from the front of the room. They need big, legible lyrics and nothing else.
- Other authenticated profiles exist in the database (`profiles` rows) but no non-admin surface is built for them; only the admin role is implemented.

## Product Purpose

LOLOSYNC projects song lyrics for a live service. The operator controls which song is on the audience screen; the audience screen follows. Success is a service where the screen is always right and never has to be fixed in front of people: the operator changes songs in one action, from any device, and the room updates within a second over Supabase Realtime.

## Positioning

A lyrics-projection console, not a general media or playlist app: the audience view is the product, and the admin console is a remote control for it. The differentiator is the live-state handoff — one operator, one shared truth, every screen in the room follows instantly — plus per-song background gradients so a song change is legible from the back of a dim room.

## Operating Context

- Live worship service, dim room, projected or large-display audience screen; the operator's own device is often dim-lit, and sometimes a phone held in one hand.
- Telugu Christian worship repertoire, currently stored as romanized Telugu (e.g. `Nuvvunte Chaley`, `Ammayi kitiki pakkana`), mixed with some English titles and lines.
- Rehearsal/prep happens days ahead: songs are written, given a background gradient, and assembled into an **event** setlist with an explicit running order.
- Setlists are ordered sequences, not collections — order carries meaning and is edited by dragging.
- Destructive actions (delete song, delete event, remove from setlist) must be confirmed; the currently live song is protected (it cannot be deleted or removed while live, and the stage must be blacked out first).
- "Played this session" is tracked in `sessionStorage`, so a song already sung in this sitting is marked — a rehearsal/runtime convenience, not durable data.
- The audience screen shows the song title, lyric lines one per row, and the signature `@ SRKR LOLO`.

## Capabilities and Constraints

- **Audience view** (`/` and any non-admin path): full-screen gradient background per song, title, lyrics one line per row, idle "Awaiting Signal" state. No chrome, no controls.
- **Admin auth**: email + password, admin role enforced by a `profiles` row; non-admins are signed out.
- **Events**: create, rename, delete; each event holds an ordered setlist of songs; switching events clears the staged song.
- **Song library**: create, edit (title, lyrics, one line per row, background gradient), delete; explicit library running order via drag.
- **Setlist editing**: drag to reorder (dnd-kit, keyboard sensor included), reorder persists to `event_songs.sort_order` / `songs.sort_order`.
- **Adding songs to an event**: multi-select from the library; songs already in the event are not selectable.
- **Live control**: stage a song, push staged song live, blackout the stage (sets `live_state.active_song_id` to null). Realtime subscription drives both the live state and the connection status shown in the console.
- **Search** in both tabs (event setlist and library), by title.
- **Background gradients**: a fixed set of 12 named gradient IDs; stored per song as a Tailwind class string and rendered as CSS `linear-gradient`. Random assignment on create.
- **Deployment**: static SPA on Vercel with an all-paths rewrite to `index.html`; environment variables supply the Supabase URL and publishable key.
- **Undecided / not built**: no non-admin surface; no song scheduling by clock; no lyric timing or scroll sync; no multi-event simultaneous display; no audit log of pushes.
- Local development requires a `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; without them the Supabase client throws at import, so the app cannot run locally unconfigured.

## Brand Commitments

- Product name: **LOLOSYNC** (rendered as `LOLO` + accented `SYNC` in the current UI).
- Audience-screen signature line `@ SRKR LOLO` — keep verbatim on the audience view.
- User-pinned visual constraint (2026-10-03): **backstage dark console** direction for the admin surface, balanced weighting across live control / setlist curation / library authoring, and **Sora + IBM Plex Mono** as the type system.
- Voice in the interface is plain and operational: name the action ("Push to live", "Blackout stage"), never sell or apologise.

## Evidence on Hand

- Real song data lives in Supabase (`songs`, `events`, `event_songs`, `live_state`) — not in the repo. The connected MCP project is a different application (habits/expenses/journal tables), so it holds no lyric data.
- Historic repository evidence of the catalogue and its Telugu content: `git show 2ab99e6~1:src/songs.ts` (removed when song management moved to Supabase).
- No photography, logo, or brand assets exist beyond the wordmark text and `public/favicon.ico`.
- No testimonials, usage metrics, or institutional claims exist. Nothing about attendance, congregation size, or client list may be invented.
- No design documentation (`DESIGN.md`) and no committed design system; the incumbent styling is ad-hoc Tailwind classes in `src/App.tsx`.

## Product Principles

1. **The live song is never in doubt.** One glance tells the operator what the room is showing right now, and the room always agrees with it.
2. **One action to change what people see.** Staging and pushing are separate deliberate steps; going live is never an accident.
3. **Setlists are sequences.** Order is content, edited directly and visibly, and survives a reload.
4. **Operable in the dark, at arm's length, one-handed.** Dims for a dim room, big targets, nothing hidden behind hover-only affordances.
5. **Destructive means destructive, and the stage is protected.** Confirmation before removing anything, and nothing can be pulled out from under a live song.

## Accessibility & Inclusion

- The operator works in a dim room during a service: no reliance on hover-only controls, and the live state must not be communicated by colour alone.
- Keyboard paths matter for speed: dnd-kit's keyboard sensor exists for reordering, so drag handles must stay focusable, and focus must be visible.
- Telugu (and possibly English) content must render in a face that carries the script; no tofu, no broken shaping.