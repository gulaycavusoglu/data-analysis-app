"use client";

import { useUser } from "@auth0/nextjs-auth0/client";

export default function AuthNav() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <span className="text-sm text-[var(--text-muted)]">Loading…</span>;
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-[var(--text-muted)] sm:inline">
          {user.name ?? user.email}
        </span>
        <a
          href="/auth/logout"
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm transition-colors hover:bg-[var(--border)]/30"
        >
          Log out
        </a>
      </div>
    );
  }

  return (
    <a
      href="/auth/login"
      className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
    >
      Log in
    </a>
  );
}
