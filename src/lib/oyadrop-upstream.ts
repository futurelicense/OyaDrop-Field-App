/**
 * Base URL for Oya Eat Provider external API (no trailing slash).
 * Server + client: prefer NEXT_PUBLIC_OYADROP_BASE_URL.
 * Server-only override: OYA_EAT_PROVIDER_UPSTREAM_BASE.
 */
export function getOyaEatProviderUpstreamBase(): string {
  const explicit =
    process.env.OYA_EAT_PROVIDER_UPSTREAM_BASE?.trim() ||
    process.env.NEXT_PUBLIC_OYADROP_BASE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  return "https://www.oyadrop.com/api/external/oya-eat-provider";
}
