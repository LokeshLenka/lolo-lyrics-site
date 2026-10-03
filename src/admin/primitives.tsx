import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";

/* --- Lamps: state is never colour alone, always a word beside the dot --- */

export function Lamp({
  tone,
  children,
  pulse = false,
  className,
}: {
  tone: "lamp" | "ok" | "warn" | "bad" | "idle";
  children: ReactNode;
  pulse?: boolean;
  className?: string;
}) {
  const dot = {
    lamp: "bg-lamp",
    ok: "bg-signal-ok",
    warn: "bg-signal-warn",
    bad: "bg-signal-bad",
    idle: "bg-ink-3",
  }[tone];

  const ink = {
    lamp: "text-lamp",
    ok: "text-signal-ok",
    warn: "text-signal-warn",
    bad: "text-signal-bad",
    idle: "text-ink-3",
  }[tone];

  return (
    <span className={cn("inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase", ink, className)}>
      <span className={cn("size-1.5 rounded-full", dot, pulse && "animate-pulse")} aria-hidden="true" />
      {children}
    </span>
  );
}

/* --- Buttons: one vocabulary, three intensities --- */

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    tone?: "lamp" | "quiet" | "danger" | "ghost";
    size?: "sm" | "md" | "lg";
  }
>(function Button(
  { tone = "quiet", size = "md", className, type = "button", ...props },
  ref,
) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-40";

  const sizes = {
    sm: "h-8 px-2.5 text-[12px]",
    md: "h-10 px-3.5 text-[13px]",
    lg: "h-12 px-5 text-sm",
  }[size];

  const tones = {
    lamp: "bg-lamp text-lamp-ink hover:bg-lamp/90 font-semibold",
    quiet: "border border-hairline bg-raised text-ink hover:border-hairline-strong hover:bg-raised/70",
    danger: "border border-signal-bad/35 bg-signal-bad/10 text-signal-bad hover:bg-signal-bad/20",
    ghost: "text-ink-2 hover:bg-white/6 hover:text-ink",
  }[tone];

  return <button ref={ref} type={type} className={cn(base, sizes, tones, className)} {...props} />;
});

/* --- Readout: tabular numeric facts --- */

export function Readout({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("tnum font-mono text-[11px] text-ink-3", className)}>{children}</span>;
}
