import React, { useState, useEffect, useRef } from "react";
import mqtt from "mqtt";
import { motion } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { SONG_DATABASE, type Song } from "./songs";

// --- CONFIGURATION ---
// CHANGE THIS TO SOMETHING UNIQUE!
const MQTT_TOPIC = "concert/live/unique-id-998877";
const BROKER_URL = "wss://broker.hivemq.com:8000/mqtt";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeSongId, setActiveSongId] = useState<string | null>(null);
  const [activeLineIndex, setActiveLineIndex] = useState<number>(-1);
  const [client, setClient] = useState<mqtt.MqttClient | null>(null);
  const [status, setStatus] = useState("Connecting...");

  useEffect(() => {
    // 1. Detect Admin Mode via URL (e.g., yoursite.com/admin)
    const isUrlAdmin = window.location.pathname.includes("/admin");
    setIsAdmin(isUrlAdmin);

    // 2. Connect to Public MQTT Broker
    const mqttClient = mqtt.connect(BROKER_URL);

    mqttClient.on("connect", () => {
      setStatus("Connected");
      // Both Admin and Audience subscribe so Admin UI stays in sync too
      mqttClient.subscribe(MQTT_TOPIC, (err) => {
        if (!err) console.log("Subscribed!");
      });
    });

    // 3. Listen for Messages
    mqttClient.on("message", (topic, message) => {
      if (topic === MQTT_TOPIC) {
        const payload = JSON.parse(message.toString());
        setActiveSongId(payload.songId);
        setActiveLineIndex(payload.lineIndex);
      }
    });

    setClient(mqttClient);

    return () => {
      mqttClient.end();
    };
  }, []);

  // 4. Admin Broadcast Function
  const broadcast = (songId: string | null, lineIndex: number) => {
    if (client && client.connected) {
      const payload = JSON.stringify({ songId, lineIndex });
      // Retain: true means new users get the last message immediately upon joining
      client.publish(MQTT_TOPIC, payload, { retain: true, qos: 0 });
    }
  };

  const activeSong = SONG_DATABASE.find((s) => s.id === activeSongId) || null;

  return isAdmin ? (
    <AdminPanel
      songs={SONG_DATABASE}
      activeSong={activeSong}
      activeLineIndex={activeLineIndex}
      status={status}
      onControl={(sId, lIdx) => broadcast(sId, lIdx)}
    />
  ) : (
    <AudienceView song={activeSong} activeLineIndex={activeLineIndex} />
  );
}

// --- SUB-COMPONENT: ADMIN PANEL ---
const AdminPanel = ({
  songs,
  activeSong,
  activeLineIndex,
  status,
  onControl,
}: {
  songs: Song[];
  activeSong: Song | null;
  activeLineIndex: number;
  status: string;
  onControl: (sId: string | null, idx: number) => void;
}) => {
  return (
    <div className="flex flex-col md:flex-row h-screen bg-zinc-900 text-white font-sans overflow-hidden">
      {/* Setlist Sidebar */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-white/10 flex flex-col bg-black">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h2 className="font-bold tracking-wider text-zinc-500 text-xs uppercase">
            Setlist
          </h2>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                status === "Connected" ? "bg-green-500" : "bg-red-500"
              )}
            />
            <span className="text-[10px] text-zinc-500">{status}</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {songs.map((song) => (
            <button
              key={song.id}
              onClick={() => onControl(song.id, -1)}
              className={cn(
                "w-full text-left px-4 py-3 rounded-md transition-all text-sm font-medium",
                activeSong?.id === song.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50"
                  : "text-zinc-400 hover:bg-zinc-800"
              )}
            >
              {song.title}
            </button>
          ))}
        </div>
        <div className="p-2 border-t border-white/10">
          <button
            onClick={() => onControl(null, -1)}
            className="w-full py-3 bg-red-900/20 text-red-500 border border-red-900/50 rounded-md hover:bg-red-900/40 uppercase text-xs font-bold tracking-widest"
          >
            Stop Display
          </button>
        </div>
      </div>

      {/* Lyrics Controller */}
      <div className="flex-1 flex flex-col bg-zinc-950">
        {activeSong ? (
          <>
            <div className="p-4 border-b border-white/10 bg-zinc-900">
              <h1 className="font-bold text-lg">{activeSong.title}</h1>
              <p className="text-zinc-500 text-sm">{activeSong.artist}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {activeSong.lyrics.map((line, i) => (
                <button
                  key={i}
                  onClick={() => onControl(activeSong.id, i)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl text-lg transition-all flex items-start gap-4",
                    activeLineIndex === i
                      ? "bg-green-500/10 text-green-400 border border-green-500/30"
                      : "hover:bg-zinc-900 text-zinc-500"
                  )}
                >
                  <span className="font-mono text-xs opacity-30 mt-2 w-6">
                    {(i + 1).toString().padStart(2, "0")}
                  </span>
                  <span className="leading-snug">{line}</span>
                </button>
              ))}
              <div className="h-20" /> {/* Spacer */}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-700 font-bold uppercase tracking-widest">
            Ready to Rock
          </div>
        )}
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: AUDIENCE VIEW ---
const AudienceView = ({
  song,
  activeLineIndex,
}: {
  song: Song | null;
  activeLineIndex: number;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll logic
    if (activeLineIndex >= 0 && scrollRef.current) {
      const activeEl = document.getElementById(`line-${activeLineIndex}`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeLineIndex]);

  if (!song)
    return (
      <div className="h-screen w-full bg-black flex flex-col items-center justify-center space-y-4">
        {/* Waiting State */}
        <div className="w-16 h-16 rounded-full border-4 border-zinc-800 border-t-white animate-spin" />
        <p className="text-zinc-500 font-medium tracking-widest text-xs uppercase animate-pulse">
          Waiting for band...
        </p>
      </div>
    );

  return (
    <div
      className={cn(
        "h-screen w-full overflow-hidden relative transition-colors duration-[1500ms] ease-in-out bg-gradient-to-br",
        song.color
      )}
    >
      {/* Apple Music Style Background Elements */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[100px] z-0" />
      <div className="absolute inset-0 z-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150" />

      <div className="relative z-10 h-full flex flex-col p-6 md:p-12 pb-24">
        {/* Song Info Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          key={song.id}
          className="mb-8"
        >
          <h1 className="text-white text-3xl md:text-5xl font-extrabold tracking-tight mb-2 drop-shadow-lg">
            {song.title}
          </h1>
          <p className="text-white/70 text-xl font-medium drop-shadow-md">
            {song.artist}
          </p>
        </motion.div>

        {/* Lyrics Scroll Area */}
        <div
          className="flex-1 overflow-y-auto no-scrollbar mask-image-scroller"
          ref={scrollRef}
        >
          <div className="py-[45vh] space-y-8 md:space-y-12">
            {song.lyrics.map((line, i) => {
              const isActive = i === activeLineIndex;
              const isPast = i < activeLineIndex;

              return (
                <motion.div
                  id={`line-${i}`}
                  key={`${song.id}-${i}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{
                    opacity: isActive ? 1 : isPast ? 0.3 : 0.15,
                    scale: isActive ? 1.05 : 1,
                    filter: isActive ? "blur(0px)" : "blur(2px)",
                    y: 0,
                  }}
                  transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
                  className={cn(
                    "text-3xl md:text-6xl font-black leading-[1.15] tracking-tight origin-left transition-all duration-500 select-none",
                    isActive ? "text-white drop-shadow-2xl" : "text-white/80"
                  )}
                >
                  {line}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
