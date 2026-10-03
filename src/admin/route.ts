export type Route =
  | { kind: "dashboard" }
  | { kind: "events" }
  | { kind: "library" }
  | { kind: "live" };

export const ADMIN_PATHS = {
  dashboard: "/admin",
  events: "/admin/events",
  library: "/admin/library",
  live: "/admin/live",
} as const;

export function parseRoute(pathname: string): Route {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "admin") return { kind: "dashboard" };
  if (parts[1] === "events") return { kind: "events" };
  if (parts[1] === "library") return { kind: "library" };
  if (parts[1] === "live") return { kind: "live" };
  // Legacy console routes resolve to their nearest new home.
  if (parts[1] === "event") return { kind: "live" };
  return { kind: "dashboard" };
}
