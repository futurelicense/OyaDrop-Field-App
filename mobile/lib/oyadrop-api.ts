export type UnknownObject = Record<string, unknown>;

const DEFAULT_BASE =
  "https://www.oyadrop.com/api/external/oya-eat-provider";

export function getResolvedBaseUrl(): string {
  const raw =
    process.env.EXPO_PUBLIC_OYADROP_BASE_URL?.trim() || DEFAULT_BASE;
  return raw.replace(/\/$/, "");
}

export function normalizeOrderList(payload: unknown): UnknownObject[] {
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

export function orderDisplayId(order: UnknownObject): string {
  return String(order.id ?? order.orderRequestId ?? order.uuid ?? "—");
}

export function orderCustomerLabel(order: UnknownObject): string {
  const customer = order.customer as UnknownObject | undefined;
  return String(
    order.customerName ?? customer?.name ?? "Customer"
  );
}

export function orderStatusLabel(order: UnknownObject): string {
  return String(order.status ?? "—");
}

export async function providerApiRequest(
  token: string,
  path: string,
  method = "GET",
  body?: unknown
): Promise<unknown> {
  const base = getResolvedBaseUrl();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token.trim()}`,
    Accept: "application/json",
  };
  const init: RequestInit = { method, headers };
  if (body !== undefined && body !== null && method !== "GET") {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${base}${path}`, init);
  const text = await res.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON
  }
  if (!res.ok) {
    const detail =
      typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`${res.status} ${res.statusText}\n${detail}`);
  }
  return data;
}
