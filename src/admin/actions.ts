import type { Event, Song } from "./types";
import type { AdminActions as DataActions } from "./useAdminData";

/** What the admin screens need: the full data-level actions (every mutation
 *  takes an explicit event id — screens never depend on a globally selected
 *  event), plus session control. */
export type AdminActions = DataActions & {
  signOut: () => void;
};

export type ScreenProps = {
  songs: Song[];
  events: Event[];
  /** Songs per event id — dashboard stats, table counts, filters. */
  eventSongCounts: Record<string, number>;
  /** One-shot fetch of an event's running order for management screens. */
  loadSongsForEvent: (eventId: string) => Promise<Song[]>;
  activeSongId: string | null;
  playedSongIds: string[];
  status: import("./types").ConnectionStatus;
  initialized: boolean;
  actions: AdminActions;
  navigate: (to: string) => void;
};
