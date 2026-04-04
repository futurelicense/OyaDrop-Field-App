"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useState } from "react";

type UnknownObject = Record<string, unknown>;

function normalizeList(payload: unknown): UnknownObject[] {
  if (Array.isArray(payload)) return payload as UnknownObject[];
  if (!payload || typeof payload !== "object") return [];
  const o = payload as { data?: unknown; items?: unknown };
  if (Array.isArray(o.data)) return o.data as UnknownObject[];
  if (Array.isArray(o.items)) return o.items as UnknownObject[];
  return [];
}

export default function OrderRequestsPage() {
  const { getToken, isSignedIn } = useAuth();
  const [manualToken, setManualToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<UnknownObject[]>([]);
  const [rawJson, setRawJson] = useState<string>("");

  const resolveToken = useCallback(async () => {
    const t = await getToken();
    if (t?.trim()) return t.trim();
    const m = manualToken.trim();
    if (m) return m;
    if (typeof window !== "undefined") {
      const s = window.localStorage.getItem("oyadrop_provider_token") ?? "";
      if (s.trim()) return s.trim();
    }
    throw new Error("Sign in with Clerk or paste a bearer token below.");
  }, [getToken, manualToken]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await resolveToken();
      const res = await fetch("/api/oya-eat-provider/order-requests", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      const text = await res.text();
      setRawJson(text);
      let data: unknown = text;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { raw: text };
      }
      if (!res.ok) {
        setOrders([]);
        throw new Error(`${res.status} ${res.statusText}\n${text.slice(0, 500)}`);
      }
      setOrders(normalizeList(data));
    } catch (e) {
      setOrders([]);
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [resolveToken]);

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Order requests</h1>
        <Link className="text-sm text-zinc-600 underline" href="/">
          Provider console
        </Link>
      </div>
      <p className="text-sm text-zinc-500">
        Loaded via same-origin{" "}
        <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
          /api/oya-eat-provider/order-requests
        </code>
        , which proxies to your configured upstream (see{" "}
        <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
          NEXT_PUBLIC_OYADROP_BASE_URL
        </code>
        ).
      </p>

      <div className="space-y-2 rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
        <p className="text-xs text-zinc-500">
          Clerk: {isSignedIn ? "signed in" : "not signed in"}
        </p>
        <label className="block text-sm">
          Bearer token (if not using Clerk)
          <input
            className="mt-1 w-full rounded border border-zinc-300 bg-transparent px-2 py-1 text-sm dark:border-zinc-700"
            type="password"
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            placeholder="Optional"
          />
        </label>
        <button
          type="button"
          disabled={loading}
          className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          onClick={load}
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
      </div>

      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          List
        </h2>
        {orders.length === 0 && !error ? (
          <p className="text-sm text-zinc-500">
            No list items in response. See raw JSON below.
          </p>
        ) : null}
        <ul className="space-y-2">
          {orders.map((o, i) => {
            const id = String(o.id ?? o.orderRequestId ?? o.uuid ?? i);
            const status = String(o.status ?? "—");
            return (
              <li
                key={`${id}-${i}`}
                className="rounded border border-zinc-200 p-3 text-sm dark:border-zinc-700"
              >
                <span className="font-medium">#{id}</span>
                <span className="ml-2 text-zinc-500">{status}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Raw JSON
        </h2>
        <pre className="max-h-96 overflow-auto rounded border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-700 dark:bg-zinc-900">
          {rawJson || "—"}
        </pre>
      </section>
    </main>
  );
}
