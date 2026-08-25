import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  Clock,
  LogOut,
  Plus,
  Radio,
  ShieldAlert,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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
type ConnectionStatus = "Connecting" | "Connected" | "Disconnected";

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

  const loadSongs = useCallback(async () => {
    const { data, error } = await supabase
      .from("songs")
      .select("id, title, lyrics, color, sort_order")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    setSongs((data as DbSong[]).map(toSong));
  }, []);

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
    await loadSongs();
  }, [loadSongs]);

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

function AdminPanel({
  songs,
  activeSongId,
  status,
  refreshSongs,
  onSetLive,
}: {
  songs: Song[];
  activeSongId: string | null;
  status: ConnectionStatus;
  refreshSongs: () => Promise<void>;
  onSetLive: (id: string | null) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [stagedId, setStagedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Song | null | "new">(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const filteredSongs = useMemo(
    () =>
      songs.filter((song) =>
        song.title.toLowerCase().includes(query.toLowerCase()),
      ),
    [songs, query],
  );
  const activeSong = songs.find((song) => song.id === activeSongId);
  const stagedSong = songs.find((song) => song.id === stagedId);

  const publish = async () => {
    try {
      setActionError("");
      await onSetLive(stagedId);
      setStagedId(null);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not update live song",
      );
    }
  };
  const blackout = async () => {
    try {
      setActionError("");
      await onSetLive(null);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not clear stage",
      );
    }
  };
  const removeSong = async (song: Song) => {
    if (song.id === activeSongId) {
      setActionError("Blackout the stage before deleting the live song.");
      return;
    }
    if (!window.confirm(`Delete “${song.title}”? This cannot be undone.`))
      return;
    const { error } = await supabase
      .from("songs")
      .delete()
      .eq("id", Number(song.id));
    if (error) {
      setActionError(error.message);
      return;
    }
    await refreshSongs();
  };
  const logout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white md:flex">
      <aside className="flex w-full flex-col border-b border-white/10 bg-zinc-900/60 p-6 md:min-h-screen md:w-80 md:border-r md:border-b-0">
        <h1 className="text-2xl font-black">
          LOLO<span className="text-blue-500">SYNC</span>
        </h1>
        <p className="mb-8 mt-1 text-xs tracking-widest text-zinc-500 uppercase">
          Production console
        </p>
        <div className="space-y-3">
          <StatusCard
            icon={<Radio size={16} />}
            label="Realtime Status"
            value={status}
            ok={status === "Connected"}
          />
          <StatusCard
            icon={<Activity size={16} />}
            label="Songs"
            value={String(songs.length)}
            ok
          />
          <StatusCard
            icon={<Clock size={16} />}
            label="Live on Stage"
            value={activeSong?.title || "Blackout"}
            ok={Boolean(activeSong)}
          />
        </div>
        {actionError && (
          <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
            {actionError}
          </p>
        )}
        <div className="mt-8 space-y-3 md:mt-auto">
          <button
            onClick={blackout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-3 font-bold text-red-300"
          >
            <ShieldAlert size={17} />
            BLACKOUT STAGE
          </button>
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 py-3 text-sm font-bold text-zinc-300"
          >
            <LogOut size={17} />
            LOG OUT
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-8">
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
            {stagedId && (
              <button
                onClick={publish}
                className="mt-4 min-h-12 w-full rounded-lg bg-green-500 px-4 py-3 text-xs font-bold tracking-widest text-black uppercase transition-all hover:bg-green-400 active:scale-[0.98] sm:text-sm"
              >
                PUSH TO LIVE
              </button>
            )}
          </div>
        </div>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search setlist..."
            className="flex-1 rounded-xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-blue-500"
          />
          <button
            onClick={() => setEditing("new")}
            className="min-h-12 w-full rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold tracking-wider text-white transition-all hover:bg-blue-500 active:scale-[0.98] sm:w-auto sm:px-5 sm:text-sm"
          >
            <Plus size={18} className="inline-block sm:mr-2" />
            <span className="hidden sm:inline">ADD SONG</span>
            <span className="sm:hidden">ADD</span>
          </button>
        </div>
        {filteredSongs.length === 0 ? (
          <div className="py-16 text-center text-zinc-500">
            <AlertCircle className="mx-auto mb-3" />
            No songs found.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredSongs.map((song) => {
              const isLive = activeSongId === song.id;
              const isStaged = stagedId === song.id;
              return (
                <motion.button
                  key={song.id}
                  onClick={() => setStagedId(song.id)}
                  className={cn(
                    "relative flex min-h-28 w-full flex-col items-start justify-center overflow-hidden rounded-xl border p-4 text-left transition-all duration-200 active:scale-[0.98] sm:min-h-32 sm:p-5",
                    isLive
                      ? "border-green-400 bg-green-500/20 shadow-[0_0_20px_rgba(74,222,128,0.22)]"
                      : isStaged
                        ? "border-blue-400 bg-blue-500/20 shadow-[0_0_20px_rgba(96,165,250,0.20)]"
                        : "border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.06]",
                  )}
                >
                  <p className="text-[10px] text-zinc-500">
                    ID: {song.id.padStart(3, "0")}
                  </p>
                  <p
                    className={cn(
                      "w-full truncate text-base font-semibold sm:text-lg",
                      isLive
                        ? "text-green-200"
                        : isStaged
                          ? "text-blue-200"
                          : "text-zinc-300",
                    )}
                  >
                    {song.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {isStaged && !isLive && (
                      <span className="rounded bg-blue-500/25 px-2 py-1 text-[10px] font-bold text-blue-300">
                        STAGED
                      </span>
                    )}
                    {isLive && (
                      <span className="rounded bg-green-500 px-2 py-1 text-[10px] font-bold text-black shadow-[0_0_10px_rgba(74,222,128,0.8)]">
                        LIVE
                      </span>
                    )}
                  </div>
                  <div
                    className="mt-3 flex gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setEditing(song)}
                      className="rounded-lg bg-zinc-800 px-3 py-2 text-xs font-bold"
                    >
                      EDIT
                    </button>
                    <button
                      onClick={() => removeSong(song)}
                      className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300"
                    >
                      DELETE
                    </button>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </main>
      <AnimatePresence>
        {editing && (
          <SongModal
            song={editing === "new" ? null : editing}
            nextOrder={songs.length + 1}
            saving={saving}
            onClose={() => setEditing(null)}
            onSave={async (payload) => {
              setSaving(true);
              try {
                if (editing === "new") {
                  const { error } = await supabase
                    .from("songs")
                    .insert(payload);
                  if (error) throw error;
                } else {
                  const { error } = await supabase
                    .from("songs")
                    .update(payload)
                    .eq("id", Number(editing.id));
                  if (error) throw error;
                }
                await refreshSongs();
                setEditing(null);
              } catch (err) {
                setActionError(
                  err instanceof Error ? err.message : "Could not save song",
                );
              }
              setSaving(false);
            }}
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
      )
      }
    </AnimatePresence >
  );
}