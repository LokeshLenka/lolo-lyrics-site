import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { AdminActions } from "./admin/actions";
import { Dashboard } from "./admin/Dashboard";
import { EventsPage } from "./admin/EventsPage";
import { SongsPage } from "./admin/SongsPage";
import { LivePage } from "./admin/LivePage";
import { LoginScreen } from "./admin/LoginScreen";
import { useAdminData, useLiveSong } from "./admin/useAdminData";
import { parseRoute } from "./admin/route";
import { getGradientCss, type Song } from "./admin/types";

export default function App() {
  const isAdminRoute = window.location.pathname.startsWith("/admin");
  const { activeSong, activeSongId, status } = useLiveSong();
  const {
    isAdmin,
    initialized,
    verifySession,
    login,
    logout,
    songs,
    events,
    eventSongCounts,
    playedSongIds,
    loadSongsForEvent,
    actions,
  } = useAdminData();

  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((to: string) => {
    window.history.pushState({}, "", to);
    setPath(to);
  }, []);

  const route = useMemo(() => parseRoute(path), [path]);

  useEffect(() => {
    if (isAdminRoute) void verifySession();
  }, [isAdminRoute, verifySession]);

  const adminActions: AdminActions = useMemo(
    () => ({
      ...actions,
      signOut: () => {
        void logout();
      },
    }),
    [actions, logout],
  );

  if (!isAdminRoute) return <AudienceView song={activeSong} />;
  if (!isAdmin) return <LoginScreen onLogin={login} />;

  const screenProps = {
    songs,
    events,
    eventSongCounts,
    loadSongsForEvent,
    activeSongId,
    playedSongIds,
    status,
    initialized,
    actions: adminActions,
    navigate,
  };

  switch (route.kind) {
    case "events":
      return <EventsPage {...screenProps} />;
    case "library":
      return <SongsPage {...screenProps} />;
    case "live":
      return <LivePage {...screenProps} />;
    case "dashboard":
    default:
      return <Dashboard {...screenProps} />;
  }
}

/* --- Audience screen: the product itself. Type only, no chrome. --- */

function AudienceView({ song }: { song: Song | null }) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      {!song ? (
        <motion.div
          key="idle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="audience-idle flex min-h-dvh flex-col items-center justify-center px-6 text-center"
        >
          <div
            aria-hidden="true"
            className="size-16 rounded-full border border-hairline-strong border-t-lamp motion-safe:animate-[spin_9s_linear_infinite]"
          />
          <p className="mt-6 font-mono text-[11px] tracking-[0.28em] text-ink-3 uppercase">
            Awaiting signal
          </p>
        </motion.div>
      ) : (
        <motion.div
          key={song.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="audience-live min-h-dvh"
          style={{ backgroundImage: getGradientCss(song.color) }}
        >
          <div className="audience-content min-h-dvh bg-black/35 px-6 py-14 sm:px-10 md:px-16 lg:px-24">
            <div className="flex items-center gap-3 font-mono text-[10px] tracking-[.2em] text-white/55 uppercase">
              <span className="size-1.5 rounded-full bg-lamp" aria-hidden="true" />
              Live lyric signal
            </div>
            <h1 className="mt-8 max-w-[16ch] text-balance text-[clamp(2.5rem,7vw,5.5rem)] leading-[1.02] font-semibold tracking-[-0.03em] text-white">
              {song.title}
            </h1>

            {/* Lyrics render exactly as they were typed: one block, every line
                break and blank line preserved, no re-wrapping of the text. */}
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="mt-12 max-w-[42ch] text-pretty text-[clamp(1.35rem,3vw,2.6rem)] leading-[1.32] font-medium whitespace-pre-line text-white/95 md:mt-16"
            >
              {song.lyrics.join("\n")}
            </motion.p>

            <p className="mt-20 font-mono text-[11px] tracking-[0.22em] text-white/50 uppercase">
              @ SRKR LOLO
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
