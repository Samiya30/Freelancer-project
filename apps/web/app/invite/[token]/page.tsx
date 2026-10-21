
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Invitation {
  email: string;
  expiresAt?: string;
  workspace?: { name?: string };
  role?: { name?: string };
  invitedBy?: { name?: string; email?: string };
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function InvitationPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadInvitation() {
      try {
        const response = await fetch(
          `${API_URL}/api/members/invitations/token/${encodeURIComponent(token)}`,
          { credentials: "include", cache: "no-store" }
        );

        const result = await response.json();

        if (!response.ok || result.success === false) {
          throw new Error(
            result.message || "This invitation is invalid or has expired."
          );
        }

        if (!cancelled) {
          setInvitation(result.data ?? result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to verify this invitation."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (token) void loadInvitation();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleAccept(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch(
        `${API_URL}/api/members/invitations/token/${encodeURIComponent(token)}/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name: name.trim(), password }),
        }
      );

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Unable to accept this invitation."
        );
      }

      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-100 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-white bg-white p-8 shadow-xl shadow-indigo-100/60">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white">
            F
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              FreelanceOS
            </h1>
            <p className="text-sm text-slate-500">
              Your workspace, together.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="py-8 text-center text-slate-500">
            Verifying your invitation...
          </p>
        ) : error && !invitation ? (
          <div className="rounded-2xl bg-red-50 p-5">
            <h2 className="font-semibold text-red-800">
              Invitation unavailable
            </h2>
            <p className="mt-2 text-sm text-red-700">{error}</p>
            <button
              onClick={() => router.push("/login")}
              className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700"
            >
              Go to login
            </button>
          </div>
        ) : invitation ? (
          <>
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
                Workspace invitation
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">
                You're invited!
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Create your account to join your team on FreelanceOS.
              </p>
            </div>

            <div className="mb-6 rounded-2xl bg-indigo-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-indigo-500">
                Workspace
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {invitation.workspace?.name || "Your team workspace"}
              </p>
              {invitation.role?.name && (
                <p className="mt-1 text-sm text-slate-600">
                  Joining as {invitation.role.name}
                </p>
              )}
              <p className="mt-2 break-all text-sm text-slate-600">
                {invitation.email}
              </p>
            </div>

            <form onSubmit={handleAccept} className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Your full name
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter your full name"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Create a password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Joining workspace..." : "Accept invitation"}
              </button>
            </form>

            <p className="mt-5 text-center text-xs leading-5 text-slate-500">
              Already have a FreelanceOS account?{" "}
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="font-semibold text-indigo-600 hover:underline"
              >
                Sign in
              </button>
            </p>
          </>
        ) : null}
      </section>
    </main>
  );
}
