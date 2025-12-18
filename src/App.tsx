import { useState, useEffect } from "react";
import mqtt from "mqtt";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { SONG_DATABASE } from "./songs";
import type { Song } from "./songs";

// --- CONFIGURATION ---
const BROKER_URL = "wss://broker.emqx.io:8084/mqtt";
// Keep your unique ID!
const MQTT_TOPIC = "concert/live/unique-id-998877";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeSongId, setActiveSongId] = useState<string | null>(null);
  const [client, setClient] = useState<mqtt.MqttClient | null>(null);
  const [status, setStatus] = useState("Connecting...");

  useEffect(() => {
    // 1. Detect Admin
    const isUrlAdmin = window.location.pathname.includes("/admin");
    setIsAdmin(isUrlAdmin);

    // 2. Connect to Broker
    console.log(`Connecting to ${BROKER_URL}...`);
    const mqttClient = mqtt.connect(BROKER_URL);

    mqttClient.on("connect", () => {
      setStatus("Connected");
      // Subscribe to listen for updates (even Admin listens to confirm receipt)
      mqttClient.subscribe(MQTT_TOPIC);
    });

    mqttClient.on("message", (topic, message) => {
      if (topic === MQTT_TOPIC) {
        const payload = JSON.parse(message.toString());
        console.log("New Song:", payload.songId);
        setActiveSongId(payload.songId);
      }
    });

    setClient(mqttClient);
    return () => {
      mqttClient.end();
    };
  }, []);

  // 3. Admin Broadcast (Only sends Song ID now)
  const setSong = (songId: string | null) => {
    // Optimistic update
    setActiveSongId(songId);

    if (client && client.connected) {
      const payload = JSON.stringify({ songId });
      client.publish(MQTT_TOPIC, payload, { retain: true, qos: 0 });
    }
  };

  const activeSong = SONG_DATABASE.find((s) => s.id === activeSongId) || null;

  return isAdmin ? (
    <AdminPanel
      songs={SONG_DATABASE}
      activeSongId={activeSongId}
      status={status}
      onSelectSong={setSong}
    />
  ) : (
    <AudienceView song={activeSong} />
  );
}

// --- ADMIN PANEL (Simplified: Just a Song Selector) ---
const AdminPanel = ({
  songs,
  activeSongId,
  status,
  onSelectSong,
}: {
  songs: Song[];
  activeSongId: string | null;
  status: string;
  onSelectSong: (id: string | null) => void;
}) => {
  return (
    <div className="min-h-screen bg-zinc-900 text-white p-6 font-sans">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-end border-b border-white/10 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Live Control</h1>
            <p className="text-zinc-500 text-sm">
              Tap a song to display lyrics
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                status === "Connected" ? "bg-green-500" : "bg-red-500"
              )}
            />
            {status}
          </div>
        </div>

        {/* Song Grid */}
        <div className="space-y-3">
          {songs.map((song) => (
            <button
              key={song.id}
              onClick={() => onSelectSong(song.id)}
              className={cn(
                "w-full text-left p-5 rounded-2xl transition-all duration-200 border relative overflow-hidden group cursor-pointer",
                activeSongId === song.id
                  ? "bg-blue-600 border-blue-500 shadow-xl shadow-blue-900/30 scale-105 z-10 hover:bg-blue-900"
                  : "bg-zinc-800 border-transparent hover:bg-zinc-750 active:scale-95 hover:border-4 hover:border-blue-900 transition-all duration-200"
              )}
            >
              <div className="relative z-10">
                <div
                  className={cn(
                    "font-bold text-lg",
                    activeSongId === song.id ? "text-white" : "text-zinc-200"
                  )}
                >
                  {song.title}
                </div>
                {/* <div
                  className={cn(
                    "text-sm",
                    activeSongId === song.id ? "text-blue-200" : "text-zinc-500"
                  )}
                >
                  {song.artist}
                </div> */}
              </div>

              {/* Active Indicator Pulse */}
              {activeSongId === song.id && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="flex gap-1">
                    <div className="w-1 h-4 bg-white/50 animate-pulse" />
                    <div className="w-1 h-6 bg-white/50 animate-pulse delay-75" />
                    <div className="w-1 h-3 bg-white/50 animate-pulse delay-150" />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Blackout Button */}
        <button
          onClick={() => onSelectSong(null)}
          className="w-full py-4 mt-8 rounded-xl bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/30 font-bold tracking-widest uppercase text-xs cursor-pointer"
        >
          Stop / Blackout
        </button>
      </div>
    </div>
  );
};

// --- AUDIENCE VIEW (Scrollable, Full Lyrics) ---
// --- AUDIENCE VIEW (Fixed Background + Scrollable Content) ---
const AudienceView = ({ song }: { song: Song | null }) => {
  return (
    <AnimatePresence mode="wait">
      {!song ? (
        // IDLE STATE
        <motion.div
          key="idle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="h-screen w-full bg-black flex flex-col items-center justify-center p-8 text-center"
        >
          <div className="w-16 h-16 mb-6 rounded-full border-4 border-zinc-800 border-t-white/50 animate-spin" />
          <h2 className="text-white/40 font-medium tracking-[0.2em] text-sm uppercase">
            Waiting for next song...
          </h2>
        </motion.div>
      ) : (
        // LYRICS STATE
        <motion.div
          key={song.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          // 1. OUTER CONTAINER: Fixed height, NO SCROLL. Holds the background.
          className={cn(
            "h-screen w-full relative overflow-hidden bg-gradient-to-br",
            song.color
          )}
        >
          {/* Static Background Effects */}
          <div className="absolute inset-0 bg-black/30 pointer-events-none z-0" />
          <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none z-0" />

          {/* 2. INNER SCROLLER: Handles the scrolling independently */}
          <div className="relative z-10 h-full w-full overflow-y-auto no-scrollbar">
            <div className="min-h-full p-6 pb-28 md:p-12 md:pb-48 flex flex-col">
              {/* Song Header */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-12 mt-4"
              >
                <h1 className="text-white text-4xl md:text-6xl font-black tracking-tight leading-none mb-2 drop-shadow-sm">
                  {song.title}
                </h1>
              </motion.div>

              {/* Lyrics */}
              <div className="space-y-6 md:space-y-8 max-w-2xl">
                {song.lyrics.map((line, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.3 + i * 0.05,
                      duration: 0.5,
                    }}
                    className="text-white/90 text-2xl md:text-4xl font-bold leading-tight drop-shadow-md"
                  >
                    {line}
                  </motion.p>
                ))}
              </div>
            </div>

            {/* End Marker */}
            <div className=" mb-2 flex justify-center opacity-30">
              <div className="w-2 h-2 bg-white rounded-full mx-1" />
              <div className="w-2 h-2 bg-white rounded-full mx-1" />
              <div className="w-2 h-2 bg-white rounded-full mx-1" />
            </div>
            <div className="text-center flex-col justify-center">
              <p>@ SRKR LOLO</p>
              <a href="https://www.linkedin.com/in/lenka-lokesh/">
                {" "}
                <p className="mb-5 inline-block">Developed by Lokesh</p>
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
