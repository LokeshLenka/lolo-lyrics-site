import { useMemo } from "react";
import { ArrowRight, CalendarDays, ListMusic, Radio } from "lucide-react";
import type { ScreenProps } from "./actions";
import { AdminShell, Panel, StatCard } from "./layout";
import { Lamp, Readout } from "./primitives";
import { ADMIN_PATHS } from "./route";

/**
 * Dashboard — the numbers that matter at a glance: library size, event
 * load, and what the room is showing right now.
 */
export function Dashboard({
  songs,
  events,
  eventSongCounts,
  activeSongId,
  status,
  initialized,
  actions,
  navigate,
}: ScreenProps) {
  const totalLines = useMemo(
    () => songs.reduce((sum, song) => sum + song.lyrics.length, 0),
    [songs],
  );
  const totalAssigned = useMemo(
    () => Object.values(eventSongCounts).reduce((sum, n) => sum + n, 0),
    [eventSongCounts],
  );
  const liveSong = useMemo(
    () => songs.find((song) => song.id === activeSongId) ?? null,
    [songs, activeSongId],
  );
  const recentEvents = useMemo(() => events.slice(0, 5), [events]);
  const newestSongs = useMemo(
    () => [...songs].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 5),
    [songs],
  );

  return (
    <AdminShell
      route="dashboard"
      title="Dashboard"
      subtitle="The numbers that matter, and what the room sees right now."
      status={status}
      songs={songs}
      activeSongId={activeSongId}
      blackoutLive={activeSongId !== null}
      onBlackout={() => actions.setLive(null)}
      onSignOut={actions.signOut}
      navigate={navigate}
    >
      {!initialized ? (
        <p className="text-[13px] text-ink-3">Loading…</p>
      ) : (
        <div className="flex flex-col gap-4 sm:gap-5">
          <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            <StatCard
              label="Songs"
              value={String(songs.length)}
              hint={`${totalLines} lyric lines in the library`}
              icon={<ListMusic size={17} aria-hidden="true" />}
            />
            <StatCard
              label="Events"
              value={String(events.length)}
              hint={`${totalAssigned} songs assigned to events`}
              icon={<CalendarDays size={17} aria-hidden="true" />}
            />
            <StatCard
              label="Lyric lines"
              value={String(totalLines)}
              hint="Across every song in the library"
              icon={<ListMusic size={17} aria-hidden="true" />}
            />
            <StatCard
              label="Live now"
              value={liveSong ? "On air" : "Dark"}
              hint={liveSong ? liveSong.title : "Stage is blacked out"}
              icon={<Radio size={17} aria-hidden="true" />}
            />
          </div>

          {/* Live status */}
          <Panel
            title="On stage"
            action={
              <button
                type="button"
                onClick={() => navigate(ADMIN_PATHS.live)}
                className="flex items-center gap-1 text-[12px] font-medium text-ink-3 transition-colors hover:text-lamp"
              >
                Open Live
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            }
          >
            <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
              {liveSong ? (
                <>
                  <Lamp tone="lamp" pulse>
                    Live
                  </Lamp>
                  <p className="min-w-0 flex-1 truncate text-[15px] font-semibold">{liveSong.title}</p>
                  <Readout className="shrink-0">{liveSong.lyrics.length} lines</Readout>
                </>
              ) : (
                <>
                  <Lamp tone="idle">Blackout</Lamp>
                  <p className="text-[13px] text-ink-3">
                    Nothing on stage. Pick an event on the Live page to start the show.
                  </p>
                </>
              )}
            </div>
          </Panel>

          <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-2">
            {/* Events overview */}
            <Panel
              title="Events"
              action={
                <button
                  type="button"
                  onClick={() => navigate(ADMIN_PATHS.events)}
                  className="flex items-center gap-1 text-[12px] font-medium text-ink-3 transition-colors hover:text-lamp"
                >
                  All events
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
              }
            >
              {recentEvents.length === 0 ? (
                <p className="px-4 py-6 text-[13px] text-ink-3 sm:px-5">
                  No events yet — create one to start building setlists.
                </p>
              ) : (
                <ul className="divide-y divide-hairline">
                  {recentEvents.map((event) => (
                    <li key={event.id}>
                      <button
                        type="button"
                        onClick={() => navigate(ADMIN_PATHS.events)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03] sm:px-5"
                      >
                        <span className="min-w-0 flex-1 truncate text-[14px] font-medium">
                          {event.name}
                        </span>
                        <Readout className="shrink-0">
                          {eventSongCounts[event.id] ?? 0} songs
                        </Readout>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {/* Newest songs */}
            <Panel
              title="Newest songs"
              action={
                <button
                  type="button"
                  onClick={() => navigate(ADMIN_PATHS.library)}
                  className="flex items-center gap-1 text-[12px] font-medium text-ink-3 transition-colors hover:text-lamp"
                >
                  Library
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
              }
            >
              {newestSongs.length === 0 ? (
                <p className="px-4 py-6 text-[13px] text-ink-3 sm:px-5">
                  The library is empty — add your first song.
                </p>
              ) : (
                <ul className="divide-y divide-hairline">
                  {newestSongs.map((song) => (
                    <li
                      key={song.id}
                      className="flex items-center gap-3 px-4 py-3 sm:px-5"
                    >
                      <span className="min-w-0 flex-1 truncate text-[14px] font-medium">
                        {song.title}
                      </span>
                      <Readout className="shrink-0">{song.lyrics.length} lines</Readout>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
