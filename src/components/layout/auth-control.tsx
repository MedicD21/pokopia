"use client";

import { useEffect, useState } from "react";

type SessionUser = {
  id: string;
  email: string;
  name: string | null;
};

export function AuthControl() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
        });
        const payload = (await response.json()) as { user: SessionUser | null };
        setUser(payload.user);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadSession();
  }, []);

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, name }),
      });

      const payload = (await response.json()) as {
        user?: SessionUser;
        error?: string;
      };

      if (!response.ok || !payload.user) {
        setMessage(payload.error ?? "Unable to sign in.");
        return;
      }

      setUser(payload.user);
      setEmail("");
      setName("");
      setMessage("Signed in. Your saves are now private to your account.");
    } catch {
      setMessage("Unable to sign in right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    setIsSubmitting(true);
    setMessage(null);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setMessage("Signed out.");
    } catch {
      setMessage("Unable to sign out right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-[color:var(--surface)] px-3 py-2 text-xs text-[color:var(--muted)]">
        Loading account...
      </div>
    );
  }

  if (user) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-1.5 text-xs font-semibold text-[color:var(--foreground)]">
            {user.name?.trim() || user.email}
          </span>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSubmitting}
            className="rounded-full bg-[color:var(--surface-strong)] px-3 py-1.5 text-xs font-semibold text-[color:var(--foreground)] disabled:opacity-50"
          >
            Sign out
          </button>
        </div>
        {message ? (
          <p className="text-xs text-[color:var(--muted)]">{message}</p>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={handleSignIn} className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          required
          className="w-48 rounded-full border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-1.5 text-xs text-[color:var(--foreground)] placeholder:text-[color:var(--muted)]"
        />
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Name (optional)"
          className="w-40 rounded-full border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-1.5 text-xs text-[color:var(--foreground)] placeholder:text-[color:var(--muted)]"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-[color:var(--accent)]/16 px-3 py-1.5 text-xs font-semibold text-[color:var(--foreground)] disabled:opacity-50"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </div>
      {message ? <p className="text-xs text-amber-200">{message}</p> : null}
    </form>
  );
}
