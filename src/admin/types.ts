export type Song = {
  id: string;
  title: string;
  lyrics: string[];
  color: string;
  sortOrder: number | null;
};

export type Event = {
  id: string;
  name: string;
  createdAt: string;
};

export type ConnectionStatus = "Connecting" | "Connected" | "Disconnected";

export type SongPayload = {
  title: string;
  lyrics: string;
  color: string;
  sort_order: number;
};

export const GRADIENTS = [
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

export const DEFAULT_COLOR = GRADIENTS[0].id;

export function getGradientCss(color: string) {
  return GRADIENTS.find((gradient) => gradient.id === color)?.css ?? GRADIENTS[0].css;
}

export function randomGradientId() {
  return GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)].id;
}