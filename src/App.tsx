import React, { useState, useEffect, useCallback, useMemo } from "react";
import mqtt from "mqtt";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { SONG_DATABASE } from "./songs";
import type { Song } from "./songs";

import {
  Search,
  Radio,
  Activity,
  Clock,
  ShieldAlert,
  Power,
  AlertCircle,
} from "lucide-react"; // npm install lucide-react

// --- ENTERPRISE CONFIGURATION ---
// In production, use environment variables (e.g., import.meta.env.VITE_MQTT_BROKER)
const CONFIG = {
  BROKER_URL:
    import.meta.env?.VITE_MQTT_BROKER || "wss://broker.emqx.io:8084/mqtt",
  MQTT_TOPIC:
    import.meta.env?.VITE_MQTT_TOPIC || "concert/live/unique-id-998877",
  ADMIN_PIN: import.meta.env?.VITE_ADMIN_PIN || "07070",
};

// Utility for Tailwind class merging
export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// --- CUSTOM HOOK: MQTT LOGIC ---
function useMqttSync() {
  const [activeSongId, setActiveSongId] = useState<string | null>(null);
  const [client, setClient] = useState<mqtt.MqttClient | null>(null);
  const [status, setStatus] = useState<
    "Connecting" | "Connected" | "Disconnected"
  >("Connecting");

  useEffect(() => {
    const mqttClient = mqtt.connect(CONFIG.BROKER_URL, {
      reconnectPeriod: 1000, // Enterprise: Auto-reconnect resilience
    });

    mqttClient.on("connect", () => {
      setStatus("Connected");
      mqttClient.subscribe(CONFIG.MQTT_TOPIC);
    });

    mqttClient.on("reconnect", () => setStatus("Connecting"));
    mqttClient.on("offline", () => setStatus("Disconnected"));

    mqttClient.on("message", (topic, message) => {
      if (topic === CONFIG.MQTT_TOPIC) {
        try {
          const payload = JSON.parse(message.toString());
          if (payload?.songId !== undefined) {
            setActiveSongId(payload.songId);
          }
        } catch (e) {
          console.error("Malformed MQTT Payload", e);
        }
      }
    });

    setClient(mqttClient);
    return () => {
      mqttClient.end();
    };
  }, []);

  const publishSong = useCallback(
    (songId: string | null) => {
      setActiveSongId(songId); // Optimistic UI update
      if (client?.connected) {
        client.publish(CONFIG.MQTT_TOPIC, JSON.stringify({ songId }), {
          retain: true,
          qos: 1,
        });
      }
    },
    [client],
  );

  return { activeSongId, status, publishSong };
}

// --- MAIN APP COMPONENT ---
export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { activeSongId, status, publishSong } = useMqttSync();

  useEffect(() => {
    setIsAdminRoute(window.location.pathname.includes("/admin"));
  }, []);

  const activeSong = useMemo(
    () => SONG_DATABASE.find((s) => s.id === activeSongId) || null,
    [activeSongId],
  );

  if (!isAdminRoute) return <AudienceView song={activeSong} />;
  if (!isAuthenticated)
    return <AuthScreen onAuth={() => setIsAuthenticated(true)} />;

  return (
    <AdminPanel
      songs={SONG_DATABASE}
      activeSongId={activeSongId}
      status={status}
      onSelectSong={publishSong}
    />
  );
}

// --- AUTH SCREEN (GLASSMORPHISM) ---
const AuthScreen = React.memo(({ onAuth }: { onAuth: () => void }) => {
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState(false);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === CONFIG.ADMIN_PIN) {
      onAuth();
    } else {
      setError(true);
      setPinInput("");
      setTimeout(() => setError(false), 500);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 to-black p-4">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-2xl shadow-2xl"
      >
        <div className="mb-8 text-center">
          <h2 className="text-sm font-semibold tracking-widest text-zinc-400 uppercase mb-2">
            System Access
          </h2>
          <div className="h-1 w-12 bg-blue-500 rounded-full mx-auto" />
        </div>

        <form onSubmit={handlePinSubmit} className="flex flex-col gap-6">
          <motion.input
            animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
            type="password"
            maxLength={5}
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="• • • • •"
            className={cn(
              "w-full rounded-xl border bg-black/50 p-4 text-center text-3xl tracking-[1em] text-white outline-none backdrop-blur-md transition-all placeholder:text-zinc-700",
              error
                ? "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                : "border-white/10 focus:border-blue-500/50 focus:shadow-[0_0_20px_rgba(59,130,246,0.2)]",
            )}
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-blue-600/90 py-4 text-sm font-semibold tracking-widest text-white shadow-lg backdrop-blur-md transition-all hover:bg-blue-500 hover:shadow-blue-500/25 active:scale-[0.98]"
          >
            AUTHENTICATE
          </button>
        </form>
      </motion.div>
    </div>
  );
});

// --- ENTERPRISE ADMIN DASHBOARD ---
const AdminPanel = React.memo(
  ({ songs, activeSongId, status, onSelectSong }: any) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [stagedSongId, setStagedSongId] = useState<string | null>(null);
    const [uptime, setUptime] = useState(0);

    // Simulated System Uptime Timer
    useEffect(() => {
      if (status === "Connected") {
        const interval = setInterval(() => setUptime((prev) => prev + 1), 1000);
        return () => clearInterval(interval);
      }
    }, [status]);

    const formatUptime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const filteredSongs = songs.filter((song: Song) =>
      song.title.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const activeSongData = songs.find((s: Song) => s.id === activeSongId);
    const stagedSongData = songs.find((s: Song) => s.id === stagedSongId);

    const handleGoLive = () => {
      if (stagedSongId) {
        onSelectSong(stagedSongId);
        setStagedSongId(null);
      }
    };

    return (
      <div className="flex h-screen w-full flex-col bg-zinc-950 font-sans text-white md:flex-row">
        {/* LEFT SIDEBAR: System Status & Controls */}
        <div className="flex w-full flex-col border-r border-white/10 bg-zinc-900/50 p-6 backdrop-blur-xl md:w-80 shrink-0">
          <div className="mb-8">
            <h1 className="text-2xl font-black tracking-tighter text-white">
              LOLO<span className="text-blue-500">SYNC</span>
            </h1>
            <p className="text-xs font-medium tracking-widest text-zinc-500 uppercase mt-1">
              Production Console
            </p>
          </div>

          {/* Status Metrics */}
          <div className="mb-8 space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-black/40 p-4 border border-white/5">
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <Radio
                  size={16}
                  className={
                    status === "Connected" ? "text-green-400" : "text-red-400"
                  }
                />
                Broker Status
              </div>
              <span
                className={cn(
                  "text-sm font-semibold",
                  status === "Connected" ? "text-green-400" : "text-red-400",
                )}
              >
                {status}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-black/40 p-4 border border-white/5">
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <Activity size={16} className="text-blue-400" />
                Ping
              </div>
              <span className="text-sm font-semibold text-blue-400">~24ms</span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-black/40 p-4 border border-white/5">
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <Clock size={16} className="text-yellow-400" />
                Session Uptime
              </div>
              <span className="text-sm font-mono text-yellow-400">
                {formatUptime(uptime)}
              </span>
            </div>
          </div>

          {/* Global Action Buttons */}
          <div className="mt-auto space-y-3">
            <button
              onClick={() => onSelectSong(null)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-4 text-sm font-bold tracking-widest text-red-400 uppercase transition-all hover:bg-red-500/20 active:scale-95"
            >
              <ShieldAlert size={18} />
              Blackout Stage
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 py-4 text-sm font-bold tracking-widest text-zinc-400 uppercase transition-all hover:bg-zinc-700 active:scale-95"
            >
              <Power size={18} />
              System Reset
            </button>
          </div>
        </div>

        {/* RIGHT MAIN AREA: Setlist & Staging */}
        <div className="flex flex-1 flex-col bg-black/90 p-6 md:p-8 h-screen overflow-hidden">
          {/* Top Bar: Now Playing vs Staged */}
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 shrink-0">
            {/* Currently Live */}
            <div className="rounded-2xl border border-blue-500/30 bg-blue-900/10 p-5 backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-bold tracking-widest text-blue-400 uppercase flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  Live on Stage
                </p>
              </div>
              <h2 className="text-2xl font-bold text-white truncate">
                {activeSongData ? activeSongData.title : "— STAGE BLACKOUT —"}
              </h2>
            </div>

            {/* Staged (Next Up) */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest text-zinc-400 uppercase mb-2">
                  Next Up (Staged)
                </p>
                <h2 className="text-xl font-medium text-zinc-300 truncate">
                  {stagedSongData
                    ? stagedSongData.title
                    : "Select a song below..."}
                </h2>
              </div>
              {stagedSongId && (
                <button
                  onClick={handleGoLive}
                  className="mt-4 w-full rounded-lg bg-green-500 py-2 text-sm font-bold text-black uppercase tracking-widest hover:bg-green-400 active:scale-95 transition-all"
                >
                  PUSH TO LIVE
                </button>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6 shrink-0">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
              size={20}
            />
            <input
              type="text"
              placeholder="Search Setlist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-4 pl-12 pr-4 text-white placeholder-zinc-500 outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
            />
          </div>

          {/* Setlist Grid (Scrollable) */}
          <div className="flex-1 overflow-y-auto no-scrollbar mask-image-scroller pb-20">
            {filteredSongs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-zinc-500 gap-2">
                <AlertCircle size={32} />
                <p>No songs found matching "{searchQuery}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                <AnimatePresence>
                  {filteredSongs.map((song: Song) => {
                    const isLive = activeSongId === song.id;
                    const isStaged = stagedSongId === song.id;

                    return (
                      <motion.button
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key={song.id}
                        onClick={() => setStagedSongId(song.id)}
                        className={cn(
                          "relative flex flex-col items-start justify-center overflow-hidden rounded-xl border p-5 text-left transition-all duration-200",
                          isLive
                            ? "border-blue-500 bg-blue-600/20 shadow-[0_0_20px_rgba(37,99,235,0.2)]"
                            : isStaged
                              ? "border-green-500/50 bg-green-500/10"
                              : "border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20",
                        )}
                      >
                        <span className="text-xs font-mono text-zinc-500 mb-1">
                          ID: {song.id.padStart(3, "0")}
                        </span>
                        <span
                          className={cn(
                            "text-lg font-semibold truncate w-full",
                            isLive
                              ? "text-white"
                              : isStaged
                                ? "text-green-300"
                                : "text-zinc-300",
                          )}
                        >
                          {song.title}
                        </span>

                        {/* Status Badges */}
                        <div className="absolute top-4 right-4 flex gap-2">
                          {isStaged && (
                            <span className="rounded bg-green-500/20 px-2 py-1 text-[10px] font-bold text-green-400">
                              STAGED
                            </span>
                          )}
                          {isLive && (
                            <span className="rounded bg-blue-500 px-2 py-1 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(59,130,246,0.8)]">
                              LIVE
                            </span>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);

// --- AUDIENCE VIEW (ANIMATED LYRICS) ---
const AudienceView = React.memo(({ song }: { song: Song | null }) => {
  return (
    <AnimatePresence mode="wait">
      {!song ? (
        <motion.div
          key="idle"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="flex h-screen w-full flex-col items-center justify-center bg-black p-8 text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
            className="mb-8 h-24 w-24 rounded-full border border-white/5 border-t-white/30 bg-white/5 backdrop-blur-xl shadow-[0_0_50px_rgba(255,255,255,0.05)]"
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
          transition={{ duration: 1 }}
          className={cn(
            "relative h-screen w-full overflow-hidden bg-gradient-to-br",
            song.color,
          )}
        >
          {/* Ambient Overlays */}
          <div className="absolute inset-0 bg-black/40 pointer-events-none z-0 mix-blend-multiply" />
          <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none z-0 mix-blend-overlay" />

          {/* Scrolling Content Container */}
          <div className="relative z-10 h-full w-full overflow-y-auto no-scrollbar mask-image-scroller">
            <div className="flex min-h-full flex-col p-6 pb-32 md:p-16 md:pb-64">
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
                className="mb-16 mt-12 md:mt-24"
              >
                <h1 className="text-5xl font-black leading-tight text-white drop-shadow-2xl md:text-8xl">
                  {song.title}
                </h1>
                <div className="mt-6 h-1 w-24 bg-white/30 rounded-full" />
              </motion.div>

              {/* Staggered Lyrics */}
              <motion.div
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 0 },
                  // ADD opacity: 1 right here 👇
                  show: { opacity: 1, transition: { staggerChildren: 0.15 } },
                }}
                className="max-w-4xl space-y-8 md:space-y-12"
              >
                {song.lyrics.map((line, i) => (
                  <motion.p
                    key={i}
                    variants={{
                      hidden: { opacity: 0, y: 20, filter: "blur(10px)" },
                      show: {
                        opacity: 1,
                        y: 0,
                        filter: "blur(0px)",
                        transition: { duration: 0.8, ease: "easeOut" },
                      },
                    }}
                    className="text-2xl font-medium leading-tight text-white/95 drop-shadow-xl md:text-5xl md:leading-snug"
                  >
                    {line}
                  </motion.p>
                ))}
              </motion.div>
            </div>

            {/* Footer Signature */}
            <div className="bottom-6 left-0 right-0 flex justify-center pointer-events-none mb-14">
              <p className="text-[10px] font-semibold tracking-widest text-white/30 uppercase backdrop-blur-md bg-black/20 px-4 py-2 rounded-full">
                @ SRKR LOLO
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
