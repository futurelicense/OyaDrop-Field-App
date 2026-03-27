"use client";

import { useAuth } from "@clerk/nextjs";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { useCallback, useMemo, useState } from "react";

type UnknownObject = Record<string, unknown>;

const BASE_URL =
  process.env.NEXT_PUBLIC_OYADROP_BASE_URL ??
  "https://oyadrop.com/api/external/oya-eat-provider";

function normalizeOrderList(payload: unknown): UnknownObject[] {
  if (Array.isArray(payload)) {
    return payload as UnknownObject[];
  }
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const value = payload as { data?: unknown; items?: unknown };
  if (Array.isArray(value.data)) {
    return value.data as UnknownObject[];
  }
  if (Array.isArray(value.items)) {
    return value.items as UnknownObject[];
  }
  return [];
}

export function ProviderConsole() {
  const { getToken, isSignedIn } = useAuth();
  const [manualToken, setManualToken] = useState("");
  const [orderId, setOrderId] = useState("");
  const [statusValue, setStatusValue] = useState("");
  const [rawPath, setRawPath] = useState("/order-requests/available");
  const [rawMethod, setRawMethod] = useState("GET");
  const [rawBody, setRawBody] = useState("");
  const [response, setResponse] = useState("Response output will appear here.");
  const [orders, setOrders] = useState<UnknownObject[]>([]);
  const [busy, setBusy] = useState(false);

  const resolvedBaseUrl = useMemo(() => BASE_URL.replace(/\/$/, ""), []);

  const envChecks = useMemo(() => {
    const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    const hasClerkPublicKey = Boolean(
      clerkPublishableKey && clerkPublishableKey.trim()
    );

    return {
      hasClerkPublicKey,
      clerkPublicKeyPreview: hasClerkPublicKey
        ? String(clerkPublishableKey).slice(0, 8) + "..."
        : null,
      hasOyaBaseUrl: Boolean(process.env.NEXT_PUBLIC_OYADROP_BASE_URL),
    };
  }, []);

  const canCallApis = isSignedIn || manualToken.trim().length > 0;

  const resolveToken = useCallback(async () => {
    const clerkToken = await getToken();
    if (clerkToken?.trim()) return clerkToken.trim();

    const local = manualToken.trim();
    if (local) return local;
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("oyadrop_provider_token") ?? "";
      if (stored.trim()) return stored.trim();
    }
    throw new Error(
      "No token available. Sign in with Clerk or provide a manual token."
    );
  }, [getToken, manualToken]);

  const printResponse = useCallback((title: string, payload: unknown) => {
    setResponse(`${title}\n\n${JSON.stringify(payload, null, 2)}`);
  }, []);

  const api = useCallback(
    async (path: string, method = "GET", body?: unknown) => {
      const token = await resolveToken();
      const headers: HeadersInit = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      };
      const options: RequestInit = { method, headers };
      if (body !== undefined && body !== null && method !== "GET") {
        headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
      }

      const res = await fetch(`${resolvedBaseUrl}${path}`, options);
      const text = await res.text();
      let data: unknown = text;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        // Keep plain text response when not JSON.
      }
      if (!res.ok) {
        throw new Error(
          `${res.status} ${res.statusText}\n${typeof data === "string" ? data : JSON.stringify(data)}`
        );
      }
      return data;
    },
    [resolveToken, resolvedBaseUrl]
  );

  const run = useCallback(
    async (label: string, fn: () => Promise<void>) => {
      try {
        setBusy(true);
        await fn();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        printResponse(`${label} error`, { message });
      } finally {
        setBusy(false);
      }
    },
    [printResponse]
  );

  const readOrderId = useCallback(() => {
    const id = orderId.trim();
    if (!id) throw new Error("Order request ID is required.");
    return id;
  }, [orderId]);

  const saveToken = () => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("oyadrop_provider_token", manualToken.trim());
    printResponse("Token saved", { ok: true });
  };

  const copyClerkToken = async () => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("No Clerk token available. Please sign in first.");
      }
      await navigator.clipboard.writeText(token);
      printResponse("Clerk token copied", {
        ok: true,
        message: "Token copied to clipboard.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      printResponse("Copy token error", { message });
    }
  };

  const clearToken = () => {
    setManualToken("");
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("oyadrop_provider_token");
    }
    printResponse("Token cleared", { ok: true });
  };

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-8">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">OyaDrop Provider Console</h1>
          <div className="flex items-center gap-2">
            {isSignedIn ? (
              <UserButton />
            ) : (
              <>
                <SignInButton mode="redirect" forceRedirectUrl="/">
                  <button
                    className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
                    type="button"
                  >
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton mode="redirect" forceRedirectUrl="/">
                  <button
                    className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-medium text-emerald-950"
                    type="button"
                  >
                    Sign up
                  </button>
                </SignUpButton>
              </>
            )}
          </div>
        </div>
        <p className="text-sm text-zinc-500">
          Next.js frontend for provider APIs with bearer token authentication.
        </p>
        <p className="text-xs text-zinc-500">
          Clerk session: {isSignedIn ? "signed in" : "not signed in"}.
        </p>
      </header>

      <section className="rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
        <h2 className="mb-3 font-medium">Authentication</h2>
        <label className="mb-3 block text-sm">
          Bearer token
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
            type="password"
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            placeholder="Paste Clerk session token or JWT"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-medium text-emerald-950 disabled:opacity-50"
            onClick={saveToken}
            disabled={busy}
            type="button"
          >
            Save token locally
          </button>
          <button
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
            onClick={copyClerkToken}
            disabled={busy || !isSignedIn}
            type="button"
          >
            Copy Clerk token
          </button>
          <button
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
            onClick={clearToken}
            disabled={busy}
            type="button"
          >
            Clear token
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
        <h2 className="mb-3 font-medium">Auth & Setup Check</h2>
        <div className="space-y-2 text-sm">
          <div>
            Clerk config:{" "}
            {envChecks.hasClerkPublicKey ? (
              <span className="text-emerald-600 dark:text-emerald-400">
                OK ({envChecks.clerkPublicKeyPreview})
              </span>
            ) : (
              <span className="text-red-600 dark:text-red-400">
                Missing `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
              </span>
            )}
          </div>
          <div>
            Clerk session:{" "}
            {isSignedIn ? (
              <span className="text-emerald-600 dark:text-emerald-400">
                Signed in
              </span>
            ) : (
              <span className="text-yellow-600 dark:text-yellow-400">
                Not signed in
              </span>
            )}
          </div>
          <div>
            OyaDrop base URL:{" "}
            <span className="font-mono text-xs text-zinc-600 dark:text-zinc-300">
              {resolvedBaseUrl}
            </span>{" "}
            {!envChecks.hasOyaBaseUrl ? (
              <span className="text-yellow-600 dark:text-yellow-400">(default)</span>
            ) : null}
          </div>
          <div className="text-xs text-zinc-500">
            Once signed in, requests use Clerk `getToken()`. Manual token input is a
            fallback.
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
        <h2 className="mb-3 font-medium">Provider</h2>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
            disabled={busy || !canCallApis}
            onClick={() =>
              run("sync-user", async () => {
                const data = await api("/sync-user", "POST");
                printResponse("sync-user success", data);
              })
            }
            type="button"
          >
            Sync user
          </button>
          <button
            className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-medium text-emerald-950 disabled:opacity-50"
            disabled={busy || !canCallApis}
            onClick={() =>
              run("providers/me", async () => {
                const data = await api("/providers/me");
                printResponse("providers/me success", data);
              })
            }
            type="button"
          >
            Get provider profile
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
        <h2 className="mb-3 font-medium">Orders</h2>
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-medium text-emerald-950 disabled:opacity-50"
            disabled={busy || !canCallApis}
            onClick={() =>
              run("order-requests/available", async () => {
                const data = await api("/order-requests/available");
                setOrders(normalizeOrderList(data));
                printResponse("order-requests/available success", data);
              })
            }
            type="button"
          >
            Get available requests
          </button>
          <button
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
            disabled={busy || !canCallApis}
            onClick={() =>
              run("order-requests", async () => {
                const data = await api("/order-requests");
                printResponse("order-requests success", data);
              })
            }
            type="button"
          >
            Get order requests
          </button>
          <button
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
            disabled={busy || !canCallApis}
            onClick={() =>
              run("order-requests/reject", async () => {
                const id = readOrderId();
                const data = await api("/order-requests/reject", "POST", { id });
                printResponse("order-requests/reject success", data);
              })
            }
            type="button"
          >
            Reject request
          </button>
          <button
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
            disabled={busy || !canCallApis}
            onClick={() =>
              run("order-requests/notify", async () => {
                const id = readOrderId();
                const data = await api("/order-requests/notify", "POST", { id });
                printResponse("order-requests/notify success", data);
              })
            }
            type="button"
          >
            Notify request
          </button>
        </div>

        <div className="mb-3 grid gap-3 md:grid-cols-2">
          <label className="block text-sm">
            Order request ID
            <input
              className="mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="e.g. 12345"
            />
          </label>
          <label className="block text-sm">
            New status (for /status)
            <input
              className="mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
              value={statusValue}
              onChange={(e) => setStatusValue(e.target.value)}
              placeholder="e.g. arrived"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
            disabled={busy || !canCallApis}
            onClick={() =>
              run("order-requests/{id}", async () => {
                const id = readOrderId();
                const data = await api(`/order-requests/${id}`);
                printResponse("order-requests/{id} success", data);
              })
            }
            type="button"
          >
            Get by ID
          </button>
          <button
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
            disabled={busy || !canCallApis}
            onClick={() =>
              run("order-requests/{id}/start", async () => {
                const id = readOrderId();
                const data = await api(`/order-requests/${id}/start`, "POST");
                printResponse("order-requests/{id}/start success", data);
              })
            }
            type="button"
          >
            Start
          </button>
          <button
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
            disabled={busy || !canCallApis}
            onClick={() =>
              run("order-requests/{id}/status", async () => {
                const id = readOrderId();
                const status = statusValue.trim();
                if (!status) throw new Error("Please provide a status value.");
                const data = await api(`/order-requests/${id}/status`, "POST", {
                  status,
                });
                printResponse("order-requests/{id}/status success", data);
              })
            }
            type="button"
          >
            Update status
          </button>
          <button
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
            disabled={busy || !canCallApis}
            onClick={() =>
              run("order-requests/{id}/cancel", async () => {
                const id = readOrderId();
                const data = await api(`/order-requests/${id}/cancel`, "POST");
                printResponse("order-requests/{id}/cancel success", data);
              })
            }
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
            disabled={busy || !canCallApis}
            onClick={() =>
              run("order-requests/{id}/contact", async () => {
                const id = readOrderId();
                const data = await api(`/order-requests/${id}/contact`);
                printResponse("order-requests/{id}/contact success", data);
              })
            }
            type="button"
          >
            Contact
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
        <h2 className="mb-3 font-medium">Available Orders (quick view)</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-zinc-500">No data loaded yet.</p>
        ) : (
          <div className="grid gap-2">
            {orders.map((order, idx) => {
              const id =
                String(order.id ?? order.orderRequestId ?? order.uuid ?? "unknown");
              const customer = String(
                order.customerName ??
                  (order.customer as UnknownObject | undefined)?.name ??
                  "Unknown customer"
              );
              const status = String(order.status ?? "n/a");
              return (
                <div
                  className="rounded-md border border-zinc-300 p-3 text-sm dark:border-zinc-700"
                  key={`${id}-${idx}`}
                >
                  <p className="font-medium">Order #{id}</p>
                  <p className="text-zinc-500">Customer: {customer}</p>
                  <p className="text-zinc-500">Status: {status}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
        <h2 className="mb-3 font-medium">Raw API Explorer</h2>
        <div className="mb-3 grid gap-3 md:grid-cols-2">
          <label className="block text-sm">
            Endpoint path
            <input
              className="mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
              value={rawPath}
              onChange={(e) => setRawPath(e.target.value)}
              placeholder="/order-requests/available"
            />
          </label>
          <label className="block text-sm">
            Method
            <select
              className="mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
              value={rawMethod}
              onChange={(e) => setRawMethod(e.target.value)}
            >
              <option>GET</option>
              <option>POST</option>
              <option>PATCH</option>
              <option>PUT</option>
              <option>DELETE</option>
            </select>
          </label>
        </div>
        <label className="mb-3 block text-sm">
          JSON body (optional)
          <textarea
            className="mt-1 min-h-28 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
            value={rawBody}
            onChange={(e) => setRawBody(e.target.value)}
            placeholder='{"foo":"bar"}'
          />
        </label>
        <button
          className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-medium text-emerald-950 disabled:opacity-50"
          disabled={busy || !canCallApis}
          onClick={() =>
            run("raw-api", async () => {
              const body = rawBody.trim() ? JSON.parse(rawBody) : undefined;
              const data = await api(rawPath.trim(), rawMethod, body);
              printResponse(`${rawMethod} ${rawPath.trim()} success`, data);
            })
          }
          type="button"
        >
          Send request
        </button>
      </section>

      <section className="rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
        <h2 className="mb-3 font-medium">Response</h2>
        <pre className="max-h-96 overflow-auto rounded-md bg-zinc-100 p-3 text-xs whitespace-pre-wrap dark:bg-zinc-900">
          {response}
        </pre>
      </section>
    </main>
  );
}
