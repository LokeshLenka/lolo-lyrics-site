import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  LogOut,
  Radio,
  X,
  GripVertical,
  Pencil,
  Trash2,
  Search,
  Plus,
  ChevronDown,
  Menu,
  ShieldAlert,
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

type Song = {
  id: string;
  title: string;
  lyrics: string[];
  color: string;
  sortOrder: number | null;
};
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
type Event = {
  id: string;
  name: string;
  createdAt: string;
};
type DbEventSong = {
  event_id: number;
  song_id: number;
  sort_order: number;
  songs: DbSong | null;
};
type ConnectionStatus = "Connecting" | "Connected" | "Disconnected";

function toEvent(row: DbEvent): Event {
  return {
    id: String(row.id),
    name: row.name,
    createdAt: row.created_at,
  };
}

const GRADIENTS = [
  {
    id: "from-slate-950 via-blue-950 to-indigo-950",
    css: "linear-gradient(135deg, #020617, #172554, #312e81)",
  },
  {
    id: "from-zinc-950 via-fuchsia-950 to-pink-950",
    css: "linear-gradient(135deg, #09090b, #4a044e, #500724)",
  },
  {
    id: "from-gray-950 via-amber-950 to-orange-950",
    css: "linear-gradient(135deg, #030712, #451a03, #431407)",
  },
  {
    id: "from-neutral-950 via-violet-950 to-purple-950",
    css: "linear-gradient(135deg, #0a0a0a, #2e1065, #3b0764)",
  },
  {
    id: "from-stone-950 via-red-950 to-rose-950",
    css: "linear-gradient(135deg, #0c0a09, #450a0a, #4c0519)",
  },
  {
    id: "from-stone-950 via-emerald-950 to-teal-950",
    css: "linear-gradient(135deg, #0c0a09, #022c22, #042f2e)",
  },
  {
    id: "from-slate-950 via-cyan-950 to-blue-950",
    css: "linear-gradient(135deg, #020617, #083344, #172554)",
  },
  {
    id: "from-neutral-950 via-orange-950 to-red-950",
    css: "linear-gradient(135deg, #0a0a0a, #431407, #450a0a)",
  },
  {
    id: "from-zinc-950 via-purple-950 to-indigo-950",
    css: "linear-gradient(135deg, #09090b, #3b0764, #312e81)",
  },
  {
    id: "from-stone-950 via-rose-950 to-pink-950",
    css: "linear-gradient(135deg, #0c0a09, #4c0519, #500724)",
  },
  {
    id: "from-gray-950 via-teal-950 to-emerald-950",
    css: "linear-gradient(135deg, #030712, #042f2e, #022c22)",
  },
  {
    id: "from-zinc-950 via-indigo-950 to-fuchsia-950",
    css: "linear-gradient(135deg, #09090b, #312e81, #4a044e)",
  },
  {
    id: "from-slate-950 via-blue-950 to-cyan-950",
    css: "linear-gradient(135deg, #020617, #172554, #083344)",
  },
  {
    id: "from-zinc-950 via-pink-950 to-purple-950",
    css: "linear-gradient(135deg, #09090b, #500724, #3b0764)",
  },
];

const DEFAULT_COLOR = GRADIENTS[0].id;

function getGradientCss(color: string) {
  return (
    GRADIENTS.find((gradient) => gradient.id === color)?.css || GRADIENTS[0].css
  );
}

function getRandomGradient(): string {
  const gradient = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
  return typeof gradient === "string" ? gradient : gradient.id;
}

function toSong(row: DbSong): Song {
  return {
    id: String(row.id),
    title: row.title,
    lyrics: row.lyrics.split("\n"),
    color: row.color || DEFAULT_COLOR,
    sortOrder: row.sort_order,
  };
}

function useLiveSong() {
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
    async function loadInitialState() {
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
    }

    loadInitialState();

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
          loadSong(
            (payload.new as { active_song_id: number | null }).active_song_id,
          ),
      )
      .subscribe((channelStatus) => {
        setStatus(channelStatus === "SUBSCRIBED" ? "Connected" : "Connecting");
        if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(channelStatus))
          setStatus("Disconnected");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadSong]);

  return { activeSong, activeSongId: activeSong?.id ?? null, status };
}

export default function App() {
  const isAdminRoute = window.location.pathname.startsWith("/admin");
  const { activeSong, activeSongId, status } = useLiveSong();
  const [isAdmin, setIsAdmin] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventSongs, setEventSongs] = useState<Song[]>([]);

  // Played this session
  const [playedSongIds, setPlayedSongIds] = useState<string[]>(() => {
    const stored = sessionStorage.getItem("lolosync-played-song-ids");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      } catch (_) {
        // ignore
      }
    }
    return [];
  });

  useEffect(() => {
    sessionStorage.setItem("lolosync-played-song-ids", JSON.stringify(playedSongIds));
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
    const fetched = rows
      .filter((row) => row.songs !== null)
      .map((row) => {
        const song = toSong(row.songs as DbSong);
        return {
          ...song,
          sortOrder: row.sort_order,
        };
      });
    setEventSongs(fetched);
  }, []);

  useEffect(() => {
    if (selectedEventId === null) {
      setEventSongs([]);
    } else {
      loadEventSongs(selectedEventId).catch(console.error);
    }
  }, [selectedEventId, loadEventSongs]);

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
    await Promise.all([loadSongs(), loadEvents()]);
  }, [loadSongs, loadEvents]);

  useEffect(() => {
    if (isAdminRoute) void verifySession();
  }, [isAdminRoute, verifySession]);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    await verifySession();
  };

  const setLiveSong = async (songId: string | null) => {
    const { error } = await supabase.rpc("set_live_song", {
      p_song_id: songId === null ? null : Number(songId),
    });
    if (error) throw error;
    if (songId !== null) {
      const idStr = String(songId);
      setPlayedSongIds((prev) =>
        prev.includes(idStr) ? prev : [...prev, idStr]
      );
    }
  };

  if (!isAdminRoute) return <AudienceView song={activeSong} />;
  if (!isAdmin) return <LoginScreen onLogin={login} />;
  return (
    <AdminPanel
      songs={songs}
      activeSongId={activeSongId}
      status={status}
      refreshSongs={loadSongs}
      onSetLive={setLiveSong}
      playedSongIds={playedSongIds}
      events={events}
      selectedEventId={selectedEventId}
      eventSongs={eventSongs}
      refreshEvents={loadEvents}
      refreshEventSongs={loadEventSongs}
      onSelectEvent={setSelectedEventId}
    />
  );
}

function LoginScreen({
  onLogin,
}: {
  onLogin: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
    setLoading(false);
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-900 p-8 shadow-2xl"
      >
        <h1 className="text-center text-2xl font-black text-white">
          LOLO<span className="text-blue-500">SYNC</span>
        </h1>
        <p className="mb-7 mt-2 text-center text-xs tracking-widest text-zinc-400 uppercase">
          Admin access
        </p>
        <div className="flex flex-col gap-4">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Admin email"
            className="rounded-xl border border-white/10 bg-black/40 p-4 text-white outline-none focus:border-blue-500"
          />
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="rounded-xl border border-white/10 bg-black/40 p-4 text-white outline-none focus:border-blue-500"
          />
          {error && (
            <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </p>
          )}
          <button
            disabled={loading}
            className="rounded-xl bg-blue-600 py-4 text-sm font-bold tracking-widest text-white disabled:opacity-50"
          >
            {loading ? "AUTHENTICATING..." : "AUTHENTICATE"}
          </button>
        </div>
      </form>
    </div>
  );
}

// Sortable song tile component
function SortableSongTile({
  song,
  isLive,
  isStaged,
  hasPlayedThisSession,
  onStage,
  onEdit,
  onDelete,
  onRemoveFromEvent,
  showRemoveFromEvent = false,
  isEventTab = false,
  showEdit = true,
}: {
  song: Song;
  isLive: boolean;
  isStaged: boolean;
  hasPlayedThisSession: boolean;
  onStage: (id: string) => void;
  onEdit: (song: Song) => void;
  onDelete?: (song: Song) => void;
  onRemoveFromEvent?: (song: Song) => void;
  showRemoveFromEvent?: boolean;
  isEventTab?: boolean;
  showEdit?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  const handleStageClick = () => {
    if (isEventTab) {
      onStage(song.id);
    }
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative flex min-h-28 w-full flex-col items-start justify-center overflow-hidden rounded-xl border p-4 text-left transition-all duration-200 active:scale-[0.98] sm:min-h-32 sm:p-5",
        isLive
          ? "border-green-400 bg-green-950/95 shadow-[0_0_20px_rgba(74,222,128,0.28)]"
          : isStaged
            ? "border-blue-400 bg-blue-950/95 shadow-[0_0_20px_rgba(96,165,250,0.28)]"
            : "border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.06]",
        isEventTab ? "cursor-pointer" : "",
      )}
      onClick={isEventTab ? handleStageClick : undefined}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="mb-1 text-xs font-mono font-semibold text-white/75">
            ID: {song.id.padStart(3, "0")}
          </p>
          <p className="w-full truncate text-base font-bold text-white drop-shadow-md sm:text-lg">
            {song.title}
          </p>
        </div>
        <button
          type="button"
          aria-label="Drag to reorder song"
          className="touch-none flex-shrink-0 rounded p-2 text-white/60 transition-colors hover:text-white/90 focus:outline-none"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={20} />
        </button>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-2">
        {isStaged && !isLive && (
          <span className="rounded bg-blue-400 px-2 py-1 text-[10px] font-black tracking-wide text-blue-950 shadow-sm">
            STAGED
          </span>
        )}
        {isLive && (
          <span className="rounded bg-green-400 px-2 py-1 text-[10px] font-black tracking-wide text-green-950 shadow-sm">
            LIVE
          </span>
        )}
        {hasPlayedThisSession && !isLive && (
          <span className="rounded border border-amber-400/40 bg-amber-400/15 px-2 py-1 text-[10px] font-black tracking-wide text-amber-200">
            PLAYED THIS SESSION
          </span>
        )}
      </div>

      {!isEventTab && (
        <div
          className="mt-3 flex gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {showEdit && (
            <button
              onClick={() => onEdit(song)}
              className="rounded-lg bg-zinc-800 px-3 py-2 text-xs font-bold"
            >
              EDIT
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(song)}
              className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300"
            >
              DELETE
            </button>
          )}
        </div>
      )}

      {isEventTab && showRemoveFromEvent && onRemoveFromEvent && (
        <button
          type="button"
          aria-label={`Remove ${song.title} from this event`}
          title="Remove from event"
          className="absolute right-3 bottom-3 flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 transition-colors hover:bg-red-500/20 hover:text-red-200 active:scale-95"
          onClick={(e) => {
            e.stopPropagation();
            onRemoveFromEvent(song);
          }}
        >
          <Trash2 size={17} />
        </button>
      )}
    </motion.div>
  );
}

// Event modal for create/rename
function EventModal({
  isOpen,
  onClose,
  onSave,
  initialName = "",
  title = "Create Event",
  saveLabel = "Create",
  saving = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  initialName?: string;
  title?: string;
  saveLabel?: string;
  saving?: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setError("");
    }
  }, [isOpen, initialName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Event name is required");
      return;
    }
    setError("");
    try {
      await onSave(trimmed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save event");
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <motion.form
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button type="button" onClick={onClose} className="text-white/60 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <div className="flex flex-col gap-4">
          <label className="text-sm text-zinc-300">
            Event Name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sunday Service"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white outline-none focus:border-blue-500"
            />
          </label>
          {error && (
            <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-600 py-3 font-bold text-white disabled:opacity-50"
          >
            {saving ? "SAVING..." : saveLabel}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

// Add songs from library modal
function AddSongsToEventModal({
  isOpen,
  onClose,
  librarySongs,
  eventSongs,
  onAdd,
  saving = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  librarySongs: Song[];
  eventSongs: Song[];
  onAdd: (songIds: string[]) => Promise<void>;
  saving?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set());
      setSearch("");
      setError("");
    }
  }, [isOpen]);

  const alreadyAddedIds = useMemo(() => new Set(eventSongs.map(s => s.id)), [eventSongs]);
  const filtered = useMemo(() => {
    return librarySongs.filter(s =>
      s.title.toLowerCase().includes(search.toLowerCase())
    );
  }, [librarySongs, search]);

  const toggleSelect = (id: string) => {
    if (alreadyAddedIds.has(id)) return;
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) return;
    setError("");
    try {
      await onAdd(Array.from(selectedIds));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add songs");
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Add Songs from Library</h2>
          <button type="button" onClick={onClose} className="text-white/60 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search library..."
              className="w-full rounded-xl border border-white/10 bg-black/40 p-3 pl-10 text-white outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div className="max-h-60 overflow-y-auto space-y-2">
          {filtered.length === 0 ? (
            <p className="text-center text-zinc-400 py-4">No songs match</p>
          ) : (
            filtered.map(song => {
              const isAdded = alreadyAddedIds.has(song.id);
              const isSelected = selectedIds.has(song.id);
              return (
                <div
                  key={song.id}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-3",
                    isAdded
                      ? "border-green-500/30 bg-green-500/10"
                      : isSelected
                        ? "border-blue-500/30 bg-blue-500/10"
                        : "border-white/5 bg-white/[0.02]"
                  )}
                >
                  <span className="text-white">{song.title}</span>
                  <button
                    type="button"
                    onClick={() => toggleSelect(song.id)}
                    disabled={isAdded}
                    className={cn(
                      "rounded px-3 py-1 text-xs font-bold",
                      isAdded
                        ? "bg-green-500/20 text-green-300 cursor-default"
                        : isSelected
                          ? "bg-blue-500 text-white"
                          : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                    )}
                  >
                    {isAdded ? "ADDED" : isSelected ? "SELECTED" : "SELECT"}
                  </button>
                </div>
              );
            })
          )}
        </div>
        {error && (
          <p className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/10 py-3 text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || selectedIds.size === 0}
            className="flex-1 rounded-xl bg-blue-600 py-3 font-bold text-white disabled:opacity-50"
          >
            {saving ? "ADDING..." : `ADD SELECTED (${selectedIds.size})`}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AdminPanel({
  songs,
  activeSongId,
  status,
  refreshSongs,
  onSetLive,
  playedSongIds,
  events,
  selectedEventId,
  eventSongs,
  refreshEvents,
  refreshEventSongs,
  onSelectEvent,
}: {
  songs: Song[];
  activeSongId: string | null;
  status: ConnectionStatus;
  refreshSongs: () => Promise<void>;
  onSetLive: (id: string | null) => Promise<void>;
  playedSongIds: string[];
  events: Event[];
  selectedEventId: string | null;
  eventSongs: Song[];
  refreshEvents: () => Promise<void>;
  refreshEventSongs: (eventId: string) => Promise<void>;
  onSelectEvent: (id: string | null) => void;
}) {
  // Tabs
  const [activeTab, setActiveTab] = useState<"events" | "library">("events");

  // Event modal state
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);

  // Add songs modal
  const [showAddSongs, setShowAddSongs] = useState(false);
  const [addingSongs, setAddingSongs] = useState(false);

  // Dropdown state for event selector
  const [isEventSelectorOpen, setIsEventSelectorOpen] = useState(false);

  // Mobile sidebar toggle for event list
  const [isEventListOpen, setIsEventListOpen] = useState(false);

  // Local state for event songs (optimistic reorder)
  const [localEventSongs, setLocalEventSongs] = useState<Song[]>(eventSongs);
  useEffect(() => {
    setLocalEventSongs(eventSongs);
  }, [eventSongs]);

  // Local state for library songs (optimistic reorder)
  const [localLibrarySongs, setLocalLibrarySongs] = useState<Song[]>(songs);
  useEffect(() => {
    setLocalLibrarySongs(songs);
  }, [songs]);

  // Staged id
  const [stagedId, setStagedId] = useState<string | null>(null);

  // Editing song
  const [editing, setEditing] = useState<Song | null | "new">(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  // Search
  const [query, setQuery] = useState("");

  // DnD sensors - increased distance to allow scrolling on mobile
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 20,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Library drag end
  const handleLibraryDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localLibrarySongs.findIndex((s) => s.id === active.id);
    const newIndex = localLibrarySongs.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(localLibrarySongs, oldIndex, newIndex);
    setLocalLibrarySongs(reordered);

    const updates: { id: string; sort_order: number }[] = reordered.map(
      (song, index) => ({ id: song.id, sort_order: index + 1 })
    );

    try {
      await Promise.all(
        updates.map(({ id, sort_order }) =>
          supabase
            .from("songs")
            .update({ sort_order })
            .eq("id", Number(id))
        )
      );
      await refreshSongs();
    } catch (err) {
      console.error(err);
      alert("Failed to save new order. Reloading saved order…");
      await refreshSongs();
    }
  };

  // Event drag end
  const handleEventDragEnd = async (event: DragEndEvent) => {
    if (!selectedEventId) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localEventSongs.findIndex((s) => s.id === active.id);
    const newIndex = localEventSongs.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(localEventSongs, oldIndex, newIndex);
    setLocalEventSongs(reordered);

    const updates: { id: string; sort_order: number }[] = reordered.map(
      (song, index) => ({ id: song.id, sort_order: index + 1 })
    );

    try {
      await Promise.all(
        updates.map(({ id, sort_order }) =>
          supabase
            .from("event_songs")
            .update({ sort_order })
            .eq("event_id", Number(selectedEventId))
            .eq("song_id", Number(id))
        )
      );
      await refreshEventSongs(selectedEventId);
    } catch (err) {
      console.error(err);
      alert("Failed to save new event order. Reloading saved order…");
      await refreshEventSongs(selectedEventId);
    }
  };

  // Publish live
  const publish = async () => {
    try {
      setActionError("");
      await onSetLive(stagedId);
      setStagedId(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not update live song");
    }
  };

  // Blackout - called from sidebar
  const blackout = async () => {
    try {
      setActionError("");
      await onSetLive(null);
      setStagedId(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not clear stage");
    }
  };

  // Remove song from event
  const removeFromEvent = async (song: Song) => {
    if (!selectedEventId) return;
    if (song.id === activeSongId) {
      setActionError("Cannot remove the currently live song from the event.");
      return;
    }
    if (!window.confirm(`Remove “${song.title}” from this event? The song will remain in the Song Library.`)) return;

    try {
      const { error } = await supabase
        .from("event_songs")
        .delete()
        .eq("event_id", Number(selectedEventId))
        .eq("song_id", Number(song.id));
      if (error) throw error;
      if (stagedId === song.id) setStagedId(null);
      await refreshEventSongs(selectedEventId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to remove from event");
    }
  };

  // Delete library song
  const deleteLibrarySong = async (song: Song) => {
    if (song.id === activeSongId) {
      setActionError("Blackout the stage before deleting the live song.");
      return;
    }
    if (!window.confirm(`Delete “${song.title}”? This will also remove it from every event setlist. This cannot be undone.`)) return;
    try {
      const { error } = await supabase
        .from("songs")
        .delete()
        .eq("id", Number(song.id));
      if (error) throw error;
      await refreshSongs();
      if (stagedId === song.id) setStagedId(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete song");
    }
  };

  // Event create
  const createEvent = async (name: string) => {
    setSavingEvent(true);
    try {
      const { data, error } = await supabase
        .from("events")
        .insert({ name })
        .select("id")
        .single();
      if (error) throw error;
      await refreshEvents();
      const newId = String(data.id);
      onSelectEvent(newId);
    } finally {
      setSavingEvent(false);
    }
  };

  // Event rename
  const renameEvent = async (name: string) => {
    if (!editingEvent) return;
    setSavingEvent(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({ name })
        .eq("id", Number(editingEvent.id));
      if (error) throw error;
      await refreshEvents();
      onSelectEvent(editingEvent.id);
    } finally {
      setSavingEvent(false);
      setEditingEvent(null);
    }
  };

  // Event delete
  const deleteEvent = async () => {
    if (!selectedEventId) return;
    const event = events.find(e => e.id === selectedEventId);
    if (!event) return;
    if (!window.confirm(`Delete “${event.name}”? Its setlist will be removed, but Song Library songs will remain available.`)) return;
    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", Number(selectedEventId));
      if (error) throw error;
      await refreshEvents();
      onSelectEvent(null);
      setStagedId(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete event");
    }
  };

  // Add songs to event
  const addSongsToEvent = async (songIds: string[]) => {
    if (!selectedEventId) return;
    setAddingSongs(true);
    try {
      const currentMax = eventSongs.reduce((max, s) => Math.max(max, s.sortOrder ?? 0), 0);
      const inserts = songIds.map((id, index) => ({
        event_id: Number(selectedEventId),
        song_id: Number(id),
        sort_order: currentMax + index + 1,
      }));
      const { error } = await supabase
        .from("event_songs")
        .insert(inserts);
      if (error) throw error;
      await refreshEventSongs(selectedEventId);
    } finally {
      setAddingSongs(false);
    }
  };

  // Selected event details
  const selectedEvent = events.find(e => e.id === selectedEventId);
  const activeSong = (activeTab === "events" ? localEventSongs : localLibrarySongs).find(s => s.id === activeSongId);
  const stagedSong = (activeTab === "events" ? localEventSongs : localLibrarySongs).find(s => s.id === stagedId);

  // Filtered songs for current tab
  const filteredSongs = useMemo(() => {
    const source = activeTab === "events" ? localEventSongs : localLibrarySongs;
    return source.filter(s => s.title.toLowerCase().includes(query.toLowerCase()));
  }, [activeTab, localEventSongs, localLibrarySongs, query]);

  const handleSelectEvent = (id: string | null) => {
    onSelectEvent(id);
    setStagedId(null);
    setIsEventSelectorOpen(false);
    setIsEventListOpen(false);
  };

  const stageSong = (id: string) => {
    setStagedId(id);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white md:flex">
      {/* Sidebar */}
      <aside className="flex w-full flex-col border-b border-white/10 bg-zinc-900/60 md:min-h-screen md:w-80 md:border-r md:border-b-0 sticky top-0 max-h-screen overflow-y-auto">
        {/* Sticky header with logo and logout */}
        <div className="sticky top-0 z-20 bg-zinc-900/80 backdrop-blur-sm border-b border-white/10 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black">
              LOLO<span className="text-blue-500">SYNC</span>
            </h1>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.reload();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-zinc-800 text-zinc-200 transition-colors hover:bg-zinc-700"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Status cards */}
        <div className="p-6 space-y-3">
          <StatusCard
            icon={<Radio size={16} />}
            label="Realtime Status"
            value={status}
            ok={status === "Connected"}
          />
          <StatusCard
            icon={<Activity size={16} />}
            label="Songs"
            value={String(localLibrarySongs.length)}
            ok
          />
          {actionError && (
            <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
              {actionError}
            </p>
          )}
          {/* Blackout button in sidebar */}
          <button
            onClick={blackout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-3 font-bold text-red-300 transition-colors hover:bg-red-500/20"
          >
            <ShieldAlert size={17} />
            BLACKOUT STAGE
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-8">
        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-white/10 pb-3">
          <button
            onClick={() => {
              setActiveTab("events");
              setIsEventListOpen(false);
            }}
            className={cn(
              "rounded-lg px-5 py-2 text-sm font-bold transition-colors",
              activeTab === "events"
                ? "bg-blue-600 text-white"
                : "text-zinc-400 hover:text-white"
            )}
          >
            EVENTS
          </button>
          <button
            onClick={() => setActiveTab("library")}
            className={cn(
              "rounded-lg px-5 py-2 text-sm font-bold transition-colors",
              activeTab === "library"
                ? "bg-blue-600 text-white"
                : "text-zinc-400 hover:text-white"
            )}
          >
            SONG LIBRARY
          </button>
        </div>

        {/* Live/Staged cards - shown only in Events tab */}
        {activeTab === "events" && (
          <div className="mb-7 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5">
              <p className="text-xs font-bold tracking-widest text-blue-300 uppercase">
                Live on stage
              </p>
              <h2 className="mt-2 truncate text-2xl font-bold">
                {activeSong?.title || "— STAGE BLACKOUT —"}
              </h2>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs font-bold tracking-widest text-zinc-400 uppercase">
                Next up
              </p>
              <h2 className="mt-2 truncate text-xl">
                {stagedSong?.title || "Select a song below"}
              </h2>
              {stagedId && selectedEventId && (
                <button
                  onClick={publish}
                  className="mt-4 min-h-12 w-full rounded-lg bg-green-500 px-4 py-3 text-xs font-bold tracking-widest text-black uppercase transition-all hover:bg-green-400 active:scale-[0.98] sm:text-sm"
                >
                  PUSH TO LIVE
                </button>
              )}
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === "events" && (
          <div className="flex flex-col md:flex-row gap-6">
            {/* Event List Sidebar - toggleable on all screens */}
            <div className={cn(
              "md:w-56 lg:w-64 flex-shrink-0",
              "transition-all duration-300",
              isEventListOpen ? "block" : "hidden"
            )}>
              <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Events</h3>
                  <button
                    type="button"
                    aria-label="Create event"
                    title="Create event"
                    onClick={() => setShowCreateEvent(true)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-500/50 bg-zinc-800 text-blue-400 transition-colors hover:bg-zinc-700"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto space-y-1">
                  {events.length === 0 ? (
                    <p className="py-2 text-center text-xs text-zinc-400">No events yet</p>
                  ) : (
                    events.map(event => {
                      const isSelected = selectedEventId === event.id;
                      return (
                        <div
                          key={event.id}
                          className={cn(
                            "flex items-center justify-between rounded-lg p-1.5 transition-colors text-sm",
                            isSelected
                              ? "bg-blue-500/20 border border-blue-500/30"
                              : "hover:bg-white/5"
                          )}
                        >
                          <button
                            onClick={() => handleSelectEvent(event.id)}
                            className="flex-1 truncate text-left font-medium"
                          >
                            {event.name}
                          </button>
                          <div className="flex gap-0.5 ml-1">
                            <button
                              type="button"
                              aria-label={`Rename ${event.name}`}
                              title="Rename"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingEvent(event);
                              }}
                              className="rounded p-0.5 text-zinc-400 hover:text-white transition-colors"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete ${event.name}`}
                              title="Delete"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (event.id === selectedEventId) {
                                  deleteEvent();
                                } else {
                                  onSelectEvent(event.id);
                                  setTimeout(() => deleteEvent(), 50);
                                }
                              }}
                              className="rounded p-0.5 text-red-400 hover:text-red-300 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Main Event Content */}
            <div className="flex-1 min-w-0">
              {/* Header: toggle + selector (no actions dropdown) */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  aria-label="Toggle event list"
                  onClick={() => setIsEventListOpen(!isEventListOpen)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-zinc-800 text-white hover:bg-zinc-700"
                >
                  <Menu size={18} />
                </button>

                <div className="relative flex-1 min-w-[140px]">
                  <button
                    type="button"
                    aria-label="Select event"
                    onClick={() => setIsEventSelectorOpen(!isEventSelectorOpen)}
                    className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-zinc-800 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
                  >
                    <span className="truncate">
                      {selectedEvent ? selectedEvent.name : "Select an event"}
                    </span>
                    <ChevronDown size={14} className="ml-2 flex-shrink-0" />
                  </button>
                  {isEventSelectorOpen && (
                    <div className="absolute left-0 top-full z-30 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-zinc-900 p-1 shadow-2xl">
                      {events.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-zinc-400">No events</div>
                      ) : (
                        events.map(event => (
                          <button
                            key={event.id}
                            onClick={() => handleSelectEvent(event.id)}
                            className={cn(
                              "w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors",
                              selectedEventId === event.id
                                ? "bg-blue-500/20 text-blue-300"
                                : "text-zinc-200 hover:bg-zinc-800"
                            )}
                          >
                            {event.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Search and Add Songs row */}
              {selectedEventId && (
                <div className="mb-4 flex items-center gap-2">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search event setlist..."
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 p-3 text-white outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => setShowAddSongs(true)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-500 active:scale-95"
                    aria-label="Add songs from library"
                    title="Add songs from library"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              )}

              {/* Setlist content */}
              {selectedEventId ? (
                <>
                  {filteredSongs.length === 0 ? (
                    <div className="py-16 text-center text-zinc-500">
                      <AlertCircle className="mx-auto mb-3" />
                      {localEventSongs.length === 0
                        ? "This event has no songs yet."
                        : "No songs match your search."}
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleEventDragEnd}
                    >
                      <SortableContext
                        items={filteredSongs.map(s => s.id)}
                        strategy={rectSortingStrategy}
                      >
                        <div
                          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                          style={{ touchAction: 'pan-y' }}
                        >
                          {filteredSongs.map(song => {
                            const isLive = activeSongId === song.id;
                            const isStaged = stagedId === song.id;
                            const hasPlayed = playedSongIds.includes(song.id);
                            return (
                              <SortableSongTile
                                key={song.id}
                                song={song}
                                isLive={isLive}
                                isStaged={isStaged}
                                hasPlayedThisSession={hasPlayed}
                                onStage={stageSong}
                                onEdit={(s) => setEditing(s)}
                                onRemoveFromEvent={removeFromEvent}
                                showRemoveFromEvent={true}
                                isEventTab={true}
                                showEdit={false}
                              />
                            );
                          })}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </>
              ) : (
                <div className="py-16 text-center text-zinc-500">
                  Select an event to manage its setlist.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Song Library Tab */}
        {activeTab === "library" && (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Song Library</h2>
              <button
                onClick={() => setEditing("new")}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white"
              >
                + ADD SONG
              </button>
            </div>

            <div className="mb-4">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search library..."
                className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-blue-500"
              />
            </div>

            {filteredSongs.length === 0 ? (
              <div className="py-16 text-center text-zinc-500">
                <AlertCircle className="mx-auto mb-3" />
                No songs found.
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleLibraryDragEnd}
              >
                <SortableContext
                  items={filteredSongs.map(s => s.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredSongs.map(song => {
                      const isLive = activeSongId === song.id;
                      const isStaged = stagedId === song.id;
                      const hasPlayed = playedSongIds.includes(song.id);
                      return (
                        <SortableSongTile
                          key={song.id}
                          song={song}
                          isLive={isLive}
                          isStaged={isStaged}
                          hasPlayedThisSession={hasPlayed}
                          onStage={() => {}}
                          onEdit={(s) => setEditing(s)}
                          onDelete={deleteLibrarySong}
                          showRemoveFromEvent={false}
                          isEventTab={false}
                          showEdit={true}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {editing && (
          <SongModal
            song={editing === "new" ? null : editing}
            nextOrder={(activeTab === "library" ? localLibrarySongs : localEventSongs).length + 1}
            saving={saving}
            onClose={() => setEditing(null)}
            onSave={async (payload) => {
              setSaving(true);
              try {
                if (editing === "new") {
                  const { error } = await supabase.from("songs").insert(payload);
                  if (error) throw error;
                } else {
                  const { error } = await supabase
                    .from("songs")
                    .update(payload)
                    .eq("id", Number(editing.id));
                  if (error) throw error;
                }
                await refreshSongs();
                if (activeTab === "events" && selectedEventId) {
                  await refreshEventSongs(selectedEventId);
                }
                setEditing(null);
              } catch (err) {
                setActionError(err instanceof Error ? err.message : "Could not save song");
              }
              setSaving(false);
            }}
          />
        )}
        {showCreateEvent && (
          <EventModal
            isOpen
            onClose={() => setShowCreateEvent(false)}
            onSave={createEvent}
            title="Create Event"
            saveLabel="Create Event"
            saving={savingEvent}
          />
        )}
        {editingEvent && (
          <EventModal
            isOpen
            onClose={() => setEditingEvent(null)}
            onSave={renameEvent}
            initialName={editingEvent.name}
            title="Rename Event"
            saveLabel="Save"
            saving={savingEvent}
          />
        )}
        {showAddSongs && selectedEventId && (
          <AddSongsToEventModal
            isOpen
            onClose={() => setShowAddSongs(false)}
            librarySongs={songs}
            eventSongs={localEventSongs}
            onAdd={addSongsToEvent}
            saving={addingSongs}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusCard({
  icon,
  label,
  value,
  ok,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/30 p-4">
      <span className="flex items-center gap-2 text-sm text-zinc-400">
        {icon}
        {label}
      </span>
      <span
        className={cn(
          "max-w-28 truncate text-sm font-semibold",
          ok ? "text-green-400" : "text-zinc-400",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function SongModal({
  song,
  nextOrder,
  saving,
  onClose,
  onSave,
}: {
  song: Song | null;
  nextOrder: number;
  saving: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    lyrics: string;
    color: string;
    sort_order: number;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState(song?.title || "");
  const [lyrics, setLyrics] = useState(song?.lyrics.join("\n") || "");
  const initialColor =
    typeof song?.color === "string" && song.color.trim()
      ? song.color
      : getRandomGradient();

  const [color, setColor] = useState<string>(initialColor);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !lyrics.trim()) return;
    await onSave({
      title: title.trim(),
      lyrics: lyrics.trim(),
      color: color || DEFAULT_COLOR,
      sort_order: song?.sortOrder || nextOrder,
    });
  };
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <motion.form
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        onSubmit={submit}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {song ? "Edit Song" : "Add New Song"}
          </h2>
          <button type="button" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="flex flex-col gap-4">
          <label className="text-sm text-zinc-300">
            Song title
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white outline-none focus:border-blue-500"
            />
          </label>
          <label className="text-sm text-zinc-300">
            Lyrics — one line per row
            <textarea
              required
              rows={14}
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-black/40 p-3 text-white outline-none focus:border-blue-500"
            />
          </label>
          <div className="rounded-xl border border-white/10 bg-black/40 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-sm text-zinc-300">Song background</span>

              <button
                type="button"
                onClick={() => setColor(getRandomGradient())}
                className="rounded-lg bg-zinc-800 px-3 py-2 text-xs font-bold text-white hover:bg-zinc-700"
              >
                RANDOMIZE
              </button>
            </div>

            <div
              className="h-16 rounded-lg border border-white/10"
              style={{ backgroundImage: getGradientCss(color) }}
            />
          </div>
          <button
            disabled={saving}
            className="rounded-xl bg-green-500 py-3 font-bold text-black disabled:opacity-50"
          >
            {saving ? "SAVING..." : "SAVE SONG"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function AudienceView({ song }: { song: Song | null }) {
  return (
    <AnimatePresence mode="wait">
      {!song ? (
        <motion.div
          key="idle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex min-h-screen flex-col items-center justify-center bg-black p-8 text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
            className="mb-8 h-24 w-24 rounded-full border border-white/10 border-t-white/60"
          />
          <h2 className="text-xs font-medium tracking-[0.3em] text-zinc-500 uppercase">
            Awaiting Signal
          </h2>
        </motion.div>
      ) : (
        <motion.div
          key={song.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-screen"
          style={{ backgroundImage: getGradientCss(song.color) }}
        >
          <div className="min-h-screen bg-black/40 p-6 md:p-16">
            <h1 className="mb-16 mt-12 text-5xl font-black text-white md:text-8xl">
              {song.title}
            </h1>
            <div className="max-w-4xl space-y-8 md:space-y-12">
              {song.lyrics.map((line, index) => (
                <motion.p
                  key={`${line}-${index}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.04, 1) }}
                  className="text-2xl font-medium leading-tight text-white md:text-5xl md:leading-snug"
                >
                  {line || " "}
                </motion.p>
              ))}
            </div>
            <p className="mt-20 text-center text-xs tracking-widest text-white/40">
              @ SRKR LOLO
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}