import { useMemo, useState } from "react";
import type { ScreenProps, AdminActions } from "./admin/actions";
import { getGradientCss, type Event, type Song, type SongPayload } from "./admin/types";
import { parseRoute } from "./admin/route";
import { Dashboard } from "./admin/Dashboard";
import { EventsPage } from "./admin/EventsPage";
import { SongsPage } from "./admin/SongsPage";
import { LivePage } from "./admin/LivePage";

/* Development-only harness: renders the admin screens against mock data so
   the UI can be inspected, screenshotted and behaviour-checked without a
   Supabase project. Reachable only via harness.html, which the production
   build does not emit. */

const LYRICS = [
  "Oka Chooputo Naalone Puttinde",
  "Edo Vintaga Gundelo Cherinde",
  "Nuvvavaro Naalo Ani Adigane",
  "Tanega Premani Thelipinde",
  "Parichayam Ledani Adiga Premante",
  "Kalisanga Ikapai Manamega Ande",
];

function makeSong(id: number, title: string, color: string, lines = 6): Song {
  return {
    id: String(id),
    title,
    color,
    lyrics: Array.from({ length: lines }, (_, i) => `${LYRICS[i % LYRICS.length]} ${i + 1}`),
    sortOrder: id,
  };
}

const SONGS: Song[] = [
  makeSong(1, "Nuvvunte Chaley", "from-slate-950 via-blue-950 to-indigo-950"),
  makeSong(2, "Ammayi kitiki pakkana", "from-gray-950 via-amber-950 to-orange-950"),
  makeSong(3, "Oy Oy", "from-neutral-950 via-violet-950 to-purple-950"),

  makeSong(4, "Karige loga", "from-stone-950 via-emerald-950 to-teal-950", 24),
  makeSong(5, "Apudo ipudo", "from-zinc-950 via-fuchsia-950 to-pink-950"),
  makeSong(6, "Monna Kanipinchavu", "from-stone-950 via-red-950 to-rose-950", 18),
  makeSong(7, "Manasu Maree", "from-slate-950 via-cyan-950 to-blue-950", 12),
  makeSong(8, "Singles Anthem", "from-zinc-950 via-purple-950 to-indigo-950"),
  makeSong(9, "Oh Priya Priya", "from-gray-950 via-teal-950 to-emerald-950", 20),
  makeSong(10, "Sirivennela", "from-neutral-950 via-orange-950 to-red-950", 9),
];

const INITIAL_EVENTS: Event[] = [
  { id: "1", name: "Sunday Service — Telugu", createdAt: "2026-10-01" },
  { id: "2", name: "Youth Evening", createdAt: "2026-09-24" },
  { id: "3", name: "Christmas Special", createdAt: "2026-09-12" },
];

/* "Apudo ipudo" and "Singles Anthem" are deliberately absent from the
   starting queue, so the capture run always has something to add. */
const INITIAL_QUEUE = [SONGS[0], SONGS[1], SONGS[2], SONGS[3], SONGS[5], SONGS[6], SONGS[8]];

export function Harness({ initialPath = "/admin" }: { initialPath?: string }) {
  const [path, setPath] = useState(initialPath);
  const [activeSongId, setActiveSongId] = useState<string | null>("1");
  const [lastPushed, setLastPushed] = useState("none");
  const [songs, setSongs] = useState(SONGS);
  const [lastReorder, setLastReorder] = useState("none");
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [queue, setQueue] = useState(INITIAL_QUEUE);

  const navigate = (to: string) => setPath(to);
  const route = parseRoute(path);

  const eventSongCounts = useMemo<Record<string, number>>(
    () => ({ "1": queue.length, "2": 3, "3": 0 }),
    [queue.length],
  );

  const actions: AdminActions = {
    selectEvent: () => {},
    setLive: async (id) => {
      setActiveSongId(id);
      setLastPushed(id === null ? "blackout" : `song:${id}`);
    },
    refreshSongs: async () => {},
    refreshEventSongs: async () => {},
    createEvent: async (name) => {
      const id = String(events.length + 1);
      setEvents((current) => [{ id, name, createdAt: "2026-10-03" }, ...current]);
      return id;
    },
    renameEvent: async (id, name) => {
      setEvents((current) =>
        current.map((event) => (event.id === id ? { ...event, name } : event)),
      );
    },
    deleteEvent: async (id) => {
      setEvents((current) => current.filter((event) => event.id !== id));
    },
    addSongsToEvent: async (_eventId, ids) => {
      setQueue((current) => [
        ...current,
        ...ids
          .map((id) => songs.find((song) => song.id === id))
          .filter((song): song is Song => Boolean(song)),
      ]);
    },
    removeSongFromEvent: async (_eventId, song) => {
      setQueue((current) => current.filter((item) => item.id !== song.id));
    },
    saveSong: async (payload: SongPayload, editing) => {
      if (editing) {
        setSongs((current) =>
          current.map((s) =>
            s.id === editing.id
              ? { ...s, title: payload.title, lyrics: payload.lyrics.split("\n"), color: payload.color }
              : s,
          ),
        );
        setQueue((current) =>
          current.map((s) =>
            s.id === editing.id
              ? { ...s, title: payload.title, lyrics: payload.lyrics.split("\n"), color: payload.color }
              : s,
          ),
        );
      } else {
        setSongs((current) => [
          ...current,
          makeSong(
            current.length + 1,
            payload.title,
            payload.color,
            payload.lyrics.split("\n").length,
          ),
        ]);
      }
    },
    deleteSong: async (song) => {
      setSongs((current) => current.filter((s) => s.id !== song.id));
      setQueue((current) => current.filter((s) => s.id !== song.id));
    },
    reorder: async (scope, _eventId, orderedIds) => {
      const apply = (list: Song[]) =>
        orderedIds
          .map((id) => list.find((song) => song.id === id))
          .filter((song): song is Song => Boolean(song));

      if (scope === "library") setSongs((current) => apply(current));
      else setQueue((current) => apply(current));
      setLastReorder(orderedIds.join(","));
    },
    signOut: () => {},
  };

  const screenProps: ScreenProps = {
    songs,
    events,
    eventSongCounts,
    loadSongsForEvent: async () => queue,
    activeSongId,
    playedSongIds: ["6"],
    status: "Connected",
    initialized: true,
    actions,
    navigate,
  };

  let screen;
  if (route.kind === "events") {
    screen = <EventsPage {...screenProps} />;
  } else if (route.kind === "library") {
    screen = <SongsPage {...screenProps} />;
  } else if (route.kind === "live") {
    screen = <LivePage {...screenProps} />;
  } else {
    screen = <Dashboard {...screenProps} />;
  }

  return (
    <>
      {screen}
      {/* Capture hook: proves a push reached the data layer, not just the UI. */}
      <output className="sr-only" data-testid="last-pushed">
        {lastPushed}
      </output>
      <output className="sr-only" data-testid="last-reorder">
        {lastReorder}
      </output>
      <output className="sr-only" data-testid="queue-count">
        {queue.length}
      </output>
      <output className="sr-only" data-testid="song-count">
        {songs.length}
      </output>
      <output className="sr-only" data-testid="event-count">
        {events.length}
      </output>
      <output className="sr-only" data-testid="route">
        {path}
      </output>
    </>
  );
}

export function AudienceHarness() {
  const song = SONGS[3];
  return (
    <div className="min-h-dvh" style={{ backgroundImage: getGradientCss(song.color) }}>
      <div className="min-h-dvh bg-black/45 px-6 py-14 md:px-16">
        <h1 className="max-w-[16ch] text-[clamp(2.5rem,7vw,5.5rem)] leading-[1.02] font-semibold tracking-[-0.03em] text-white">
          {song.title}
        </h1>
        <p className="mt-12 max-w-[42ch] text-[clamp(1.35rem,3vw,2.6rem)] leading-[1.32] font-medium whitespace-pre-line text-white/95 md:mt-16">
          {song.lyrics.join("\n")}
        </p>
        <p className="mt-20 font-mono text-[11px] tracking-[0.22em] text-white/40 uppercase">
          @ SRKR LOLO
        </p>
      </div>
    </div>
  );
}
