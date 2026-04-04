import { getOyaEatProviderUpstreamBase } from "@/lib/oyadrop-upstream";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function proxy(
  req: NextRequest,
  segments: string[] | undefined,
  method: string
) {
  const base = getOyaEatProviderUpstreamBase();
  const suffix =
    segments && segments.length > 0 ? `/${segments.join("/")}` : "";
  const target = `${base}${suffix}${req.nextUrl.search}`;

  const headers: HeadersInit = {
    Accept: req.headers.get("accept") ?? "application/json",
  };
  const auth = req.headers.get("authorization");
  if (auth) {
    headers.Authorization = auth;
  }

  let body: BodyInit | undefined;
  if (method !== "GET" && method !== "HEAD") {
    const ct = req.headers.get("content-type");
    if (ct) {
      headers["Content-Type"] = ct;
    }
    body = await req.text();
  }

  const upstream = await fetch(target, { method, headers, body });

  const text = await upstream.text();
  const res = new NextResponse(text, { status: upstream.status });
  const ct = upstream.headers.get("content-type");
  if (ct) {
    res.headers.set("content-type", ct);
  }
  return res;
}

type RouteCtx = { params: Promise<{ path?: string[] }> };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path, "GET");
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path, "POST");
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path, "PATCH");
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path, "PUT");
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path, "DELETE");
}
