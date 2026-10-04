# LOLOSYNC — Live Lyrics Projection for SRKR LOLO

**LOLOSYNC** projects song lyrics for a live Telugu worship service. One operator runs the show from an admin console (`/admin`); every audience screen (any non-`/admin` path) follows the same live state in ~1 second over Supabase Realtime.

Live site: **https://lyrics.srkrlolo.in** · Audience signature: `@ SRKR LOLO`

## How it works

- **Audience view** (`/`, or any non-admin path): full-screen per-song gradient, song title, lyrics one line per row. Idle state shows "Awaiting Signal". No controls, no chrome.
- **Admin console** (`/admin`): email + password login, gated on `profiles.role = 'admin'`. Four sections — **Dashboard, Events, Library, Live**.
- **Live control flow:** stage a song → push staged song live → blackout the stage. Single-row `live_state.active_song_id` is the shared truth; `set_live_song` RPC writes it, Realtime broadcasts it.
- **Events** hold ordered setlists (drag to reorder, persists to `event_songs.sort_order`). Switching events clears the staged song.
- **Song library:** title + lyrics (one line per row) + one of 14 fixed background gradients. Drag to set library order (`songs.sort_order`).
- **Safety:** deletes / removes need confirmation; the live song can't be deleted or removed while live — blackout first. "Played this session" is `sessionStorage`-only.

## Tech stack

- React 19 + TypeScript + Vite 7, Tailwind CSS v4, Framer Motion, dnd-kit, lucide-react
- Supabase (Postgres + Auth + Realtime) via `@supabase/supabase-js`
- Static SPA deployed on **Vercel** (`vercel.json` rewrites everything to `/index.html`); Vercel Analytics + Speed Insights enabled
- Fonts: Sora + Noto Sans Telugu ( UI / lyrics ), IBM Plex Mono ( counts, statuses, readouts )

## Supabase schema (existing tables, not in repo)

| Table | Purpose |
|---|---|
| `songs` | `title`, `lyrics` (lines), `background` (gradient id), `sort_order` |
| `events` | event name |
| `event_songs` | join with `sort_order` — the setlist running order |
| `live_state` | single row, `active_song_id` — what the room sees |
| `profiles` | auth users, `role = 'admin'` gate |

Song data lives in Supabase, not in this repo.

## Local development

Requires Node 18+.

```bash
npm install
```

Create `.env` (Vite `VITE_` prefix required — the app throws at import without these):

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

```bash
npm run dev      # start dev server
npm run build    # tsc + vite build → dist/
npm run preview  # preview production build
npm run lint     # eslint
```

Admin login locally uses the same Supabase Auth users as production — sign in at `http://localhost:5173/admin`.

## Project layout

```
src/
  App.tsx            # route switch: /admin/* → console, else audience view
  admin/             # Dashboard, EventsPage, SongsPage, LivePage, LoginScreen,
                     # useAdminData, actions, route, types (gradients)
  lib/               # supabase client
  assets/
index.html           # SEO/OG meta for lyrics.srkrlolo.in, font preconnects
vercel.json          # SPA rewrite to index.html
PRODUCT.md           # product spec (users, principles, constraints)
DESIGN.md            # design system (midnight console, neon-by-role)
```

## Design notes (summary)

Backstage dark console: `console #08070B`, `panel #100D16`, `raised #1A1421`. Magenta `#E040FC` = action/focus/selection, cyan `#7FD7FD` = live/connected, red `#FF5964` = destructive. Square corners everywhere, no shadows (scrim for overlays). Every stage state is colour **plus** a word (`LIVE`, `STAGED`, `PLAYED`, `CONNECTED`, `BLACKOUT`). Counts in tabular IBM Plex Mono. See `DESIGN.md` for the full spec.

## Deployment

Push to `master` → Vercel auto-deploys the static build. No server code, no env beyond the two Supabase vars (set in the Vercel dashboard).
