import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  DEFAULT_COLOR,
  type ConnectionStatus,
  type Event,
  type Song,
  type SongPayload,
} from "./types";

type DbSong = {
  id: number;
  title: string;
  lyrics: string;
  color: string;
  sort_order: number | null;
};

type DbEvent = {
  id: number;
  name: string;
  created_at: string;
};

type DbEventSong = {
  event_id: number;
  song_id: number;
  sort_order: number;
  songs: DbSong | null;
};

function toSong(row: DbSong): Song {
  return {
    id: String(row.id),
    title: row.title,
    lyrics: row.lyrics.split("\n"),
    color: row.color || DEFAULT_COLOR,
    sortOrder: row.sort_order,
  };
}

function toEvent(row: DbEvent): Event {
  return { id: String(row.id), name: row.name, createdAt: row.created_at };
}

const PLAYED_KEY = "lolosync-played-song-ids";

function readPlayedSongIds(): string[] {
  const stored = sessionStorage.getItem(PLAYED_KEY);
  if (!stored) return [];
  try {
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function useLiveSong() {
  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("Connecting");

  const loadSong = useCallback(async (songId: number | null) => {
    if (songId === null) {
      setActiveSong(null);
      return;
    }

    const { data, error } = await supabase
      .from("songs")
      .select("id, title, lyrics, color, sort_order")
      .eq("id", songId)
      .single();

    if (error || !data) {
      console.error("Could not load live song:", error?.message);
      setActiveSong(null);
      return;
    }

    setActiveSong(toSong(data as DbSong));
  }, []);

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from("live_state")
        .select("active_song_id")
        .eq("id", 1)
        .single();

      if (error) {
        console.error("Could not load live state:", error.message);
        setStatus("Disconnected");
        return;
      }

      await loadSong(data.active_song_id);
    })();

    const channel = supabase
      .channel("live-state")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_state",
          filter: "id=eq.1",
        },
        (payload) =>
          void loadSong(
            (payload.new as { active_song_id: number | null }).active_song_id,
          ),
      )
      .subscribe((channelStatus: string) => {
        setStatus(channelStatus === "SUBSCRIBED" ? "Connected" : "Connecting");
        if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(channelStatus)) {
          setStatus("Disconnected");
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadSong]);

  return { activeSong, activeSongId: activeSong?.id ?? null, status };
}

export type AdminActions = {
  selectEvent: (id: string | null) => void;
  setLive: (songId: string | null) => Promise<void>;
  refreshSongs: () => Promise<void>;
  refreshEventSongs: (eventId: string) => Promise<void>;
  createEvent: (name: string) => Promise<string>;
  renameEvent: (id: string, name: string) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  addSongsToEvent: (eventId: string, songIds: string[], current: Song[]) => Promise<void>;
  removeSongFromEvent: (eventId: string, song: Song) => Promise<void>;
  /** Saves a song to the library. A new song lands at `nextOrder`; an edit keeps its
   *  existing position. Callers refresh any open setlist afterwards. */
  saveSong: (payload: SongPayload, editing: Song | null) => Promise<void>;
  deleteSong: (song: Song) => Promise<void>;
  reorder: (scope: "library" | "event", eventId: string | null, orderedIds: string[]) => Promise<void>;
};

export function useAdminData() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventSongsState, setEventSongsState] = useState<{
    eventId: string;
    songs: Song[];
  }>({ eventId: "", songs: [] });

  // Songs fetched for the event that is actually selected; anything else is stale.
  const eventSongs = useMemo(
    () => (eventSongsState.eventId === selectedEventId ? eventSongsState.songs : []),
    [eventSongsState, selectedEventId],
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [playedSongIds, setPlayedSongIds] = useState<string[]>(readPlayedSongIds);
  /** How many songs each event holds — powers dashboard stats and filters. */
  const [eventSongCounts, setEventSongCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    sessionStorage.setItem(PLAYED_KEY, JSON.stringify(playedSongIds));
  }, [playedSongIds]);

  const loadSongs = useCallback(async () => {
    const { data, error } = await supabase
      .from("songs")
      .select("id, title, lyrics, color, sort_order")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    setSongs((data as DbSong[]).map(toSong));
  }, []);

  const loadEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from("events")
      .select("id, name, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    setEvents((data as DbEvent[]).map(toEvent));
  }, []);

  const loadEventSongCounts = useCallback(async () => {
    const { data, error } = await supabase.from("event_songs").select("event_id");
    if (error) throw error;
    const counts: Record<string, number> = {};
    for (const row of data as { event_id: number }[]) {
      const key = String(row.event_id);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    setEventSongCounts(counts);
  }, []);

  /** One-shot fetch of a single event's running order — used by pages that
   *  manage an event without making it the globally selected one. */
  const loadSongsForEvent = useCallback(
    async (eventId: string): Promise<Song[]> => {
      const { data, error } = await supabase
        .from("event_songs")
        .select(
          `
        event_id,
        song_id,
        sort_order,
        songs (
          id,
          title,
          lyrics,
          color,
          sort_order
        )
      `,
        )
        .eq("event_id", Number(eventId))
        .order("sort_order", { ascending: true });

      if (error) throw error;

      return (data as unknown as DbEventSong[])
        .filter((row) => row.songs !== null)
        .map((row) => ({ ...toSong(row.songs as DbSong), sortOrder: row.sort_order }));
    },
    [],
  );

  const loadEventSongs = useCallback(async (eventId: string) => {
    const { data, error } = await supabase
      .from("event_songs")
      .select(`
        event_id,
        song_id,
        sort_order,
        songs (
          id,
          title,
          lyrics,
          color,
          sort_order
        )
      `)
      .eq("event_id", Number(eventId))
      .order("sort_order", { ascending: true });

    if (error) throw error;

    const rows = data as unknown as DbEventSong[];
    setEventSongsState({
      eventId,
      songs: rows
        .filter((row) => row.songs !== null)
        .map((row) => ({ ...toSong(row.songs as DbSong), sortOrder: row.sort_order })),
    });
  }, []);

  /** Opening an event loads its running order; this is the only place it happens,
   *  so a stale setlist can never be shown next to a newly selected event. */
  const selectEvent = useCallback(
    (eventId: string | null) => {
      setSelectedEventId(eventId);
      if (eventId === null) {
        setEventSongsState({ eventId: "", songs: [] });
        return;
      }
      loadEventSongs(eventId).catch(console.error);
    },
    [loadEventSongs],
  );

  const verifySession = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsAdmin(false);
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error || profile?.role !== "admin") {
      await supabase.auth.signOut();
      setIsAdmin(false);
      return;
    }

    setIsAdmin(true);
    await Promise.all([loadSongs(), loadEvents(), loadEventSongCounts()]);
    setInitialized(true);
  }, [loadSongs, loadEvents, loadEventSongCounts]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await verifySession();
    },
    [verifySession],
  );

  const saveSong = useCallback(
    async (payload: SongPayload, editing: Song | null) => {
      const request =
        editing === null
          ? supabase.from("songs").insert(payload)
          : supabase.from("songs").update(payload).eq("id", Number(editing.id));

      const { error } = await request;
      if (error) throw error;
      await loadSongs();
    },
    [loadSongs],
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setInitialized(false);
  }, []);

  const setLiveSong = useCallback(async (songId: string | null) => {
    const { error } = await supabase.rpc("set_live_song", {
      p_song_id: songId === null ? null : Number(songId),
    });
    if (error) throw error;

    if (songId !== null) {
      const id = String(songId);
      setPlayedSongIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }
  }, []);

  const createEvent = useCallback(
    async (name: string): Promise<string> => {
      const { data, error } = await supabase
        .from("events")
        .insert({ name })
        .select("id")
        .single();
      if (error) throw error;
      await Promise.all([loadEvents(), loadEventSongCounts()]);
      selectEvent(String(data.id));
      return String(data.id);
    },
    [loadEvents, loadEventSongCounts, selectEvent],
  );

  const renameEvent = useCallback(
    async (eventId: string, name: string) => {
      const { error } = await supabase
        .from("events")
        .update({ name })
        .eq("id", Number(eventId));
      if (error) throw error;
      await loadEvents();
    },
    [loadEvents],
  );

  const deleteEvent = useCallback(
    async (eventId: string) => {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", Number(eventId));
      if (error) throw error;
      await Promise.all([loadEvents(), loadEventSongCounts()]);
      setSelectedEventId((current) => (current === eventId ? null : current));
    },
    [loadEvents, loadEventSongCounts],
  );

  const addSongsToEvent = useCallback(
    async (eventId: string, songIds: string[], current: Song[]) => {
      const highest = current.reduce((max, song) => Math.max(max, song.sortOrder ?? 0), 0);
      const { error } = await supabase.from("event_songs").insert(
        songIds.map((id, index) => ({
          event_id: Number(eventId),
          song_id: Number(id),
          sort_order: highest + index + 1,
        })),
      );
      if (error) throw error;
      await Promise.all([loadEventSongs(eventId), loadEventSongCounts()]);
    },
    [loadEventSongs, loadEventSongCounts],
  );

  const removeSongFromEvent = useCallback(
    async (eventId: string, song: Song) => {
      const { error } = await supabase
        .from("event_songs")
        .delete()
        .eq("event_id", Number(eventId))
        .eq("song_id", Number(song.id));
      if (error) throw error;
      await Promise.all([loadEventSongs(eventId), loadEventSongCounts()]);
    },
    [loadEventSongs, loadEventSongCounts],
  );

  const deleteSong = useCallback(
    async (song: Song) => {
      const { error } = await supabase
        .from("songs")
        .delete()
        .eq("id", Number(song.id));
      if (error) throw error;
      await loadSongs();
    },
    [loadSongs],
  );

  const reorder = useCallback(
    async (scope: "library" | "event", eventId: string | null, orderedIds: string[]) => {
      if (scope === "event" && eventId === null) return;

      const writes = orderedIds.map((id, index) =>
        scope === "library"
          ? supabase.from("songs").update({ sort_order: index + 1 }).eq("id", Number(id))
          : supabase
              .from("event_songs")
              .update({ sort_order: index + 1 })
              .eq("event_id", Number(eventId))
              .eq("song_id", Number(id)),
      );

      const results = await Promise.all(writes);
      const failed = results.find((result) => result.error !== null);
      if (failed?.error) throw failed.error;

      if (scope === "library") await loadSongs();
      else if (eventId !== null) await loadEventSongs(eventId);
    },
    [loadEventSongs, loadSongs],
  );

  return {
      isAdmin,
      initialized,
      verifySession,
      login,
      logout,
      songs,
      events,
      eventSongs,
      eventSongCounts,
      selectedEventId,
      playedSongIds,
      loadSongsForEvent,
      actions: {
        selectEvent,
        setLive: setLiveSong,
        refreshSongs: loadSongs,
        refreshEventSongs: loadEventSongs,
        createEvent,
        renameEvent,
        deleteEvent,
        addSongsToEvent,
        removeSongFromEvent,
        saveSong,
        deleteSong,
        reorder,
      },
    };
}