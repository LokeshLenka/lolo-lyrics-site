import { useState } from "react";
import { Button } from "./primitives";

export function LoginScreen({
  onLogin,
}: {
  onLogin: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Check your details.");
      setLoading(false);
    }
  };

  return (
    <div className="login-screen relative flex min-h-dvh items-center justify-center overflow-hidden bg-console px-4 py-10">
      <div className="login-glow pointer-events-none absolute inset-0" />
      <form
        onSubmit={(e) => void submit(e)}
        className="relative w-full max-w-sm rounded-xl border border-hairline bg-panel p-6 shadow-[0_24px_80px_rgba(0,0,0,.35)] sm:p-8"
      >
        <p className="text-[19px] font-bold tracking-[-0.03em]">
          LOLO <span className="text-lamp">SYNC</span>
        </p>
        <h1 className="mt-6 text-[15px] font-semibold tracking-[-0.02em]">Sign in to the console</h1>
        <p className="mt-1 text-[13px] leading-5 text-ink-3">
          Admin access only. The audience screen needs no sign-in.
        </p>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-[11px] font-medium tracking-[0.1em] text-ink-3 uppercase">
              Email
            </span>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 h-11 w-full border border-hairline bg-console px-3 text-sm text-ink transition-colors placeholder:text-ink-3 focus:border-lamp/60 focus:outline-none"
              placeholder="you@church.org"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-medium tracking-[0.1em] text-ink-3 uppercase">
              Password
            </span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 h-11 w-full border border-hairline bg-console px-3 text-sm text-ink transition-colors placeholder:text-ink-3 focus:border-lamp/60 focus:outline-none"
            />
          </label>

          {error && (
            <p
              role="alert"
              className="border border-signal-bad/40 bg-signal-bad/10 px-3 py-2 text-[13px] text-signal-bad"
            >
              {error}
            </p>
          )}

          <Button type="submit" tone="lamp" size="lg" disabled={loading} className="w-full">
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </div>
      </form>
    </div>
  );
}
