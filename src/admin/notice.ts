import { useCallback, useEffect, useState } from "react";

export type Notice = {
  tone: "ok" | "bad";
  text: string;
  action?: { label: string; onClick: () => void };
};

export function useNotice() {
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  const clearNotice = useCallback(() => setNotice(null), []);
  const fail = useCallback(
    (error: unknown, fallback: string) =>
      setNotice({
        tone: "bad",
        text: error instanceof Error ? error.message : fallback,
      }),
    [],
  );

  return { notice, setNotice, clearNotice, fail };
}
