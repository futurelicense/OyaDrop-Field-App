import { useAuth } from "@clerk/clerk-expo";
import { useCallback, useEffect, useState } from "react";

import { providerApiRequest } from "@/lib/oyadrop-api";
import {
  getStoredString,
  removeStoredString,
  setStoredString,
} from "@/lib/storage";

const MANUAL_KEY = "oyadrop_provider_token";

export function useProviderApi() {
  const { getToken, isSignedIn } = useAuth();
  const [manualToken, setManualToken] = useState("");
  const [manualLoaded, setManualLoaded] = useState(false);
  const [storedTokenPresent, setStoredTokenPresent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await getStoredString(MANUAL_KEY);
        if (!cancelled && stored?.trim()) {
          setManualToken(stored);
          setStoredTokenPresent(true);
        }
      } catch {
        /* SecureStore unavailable on some web builds */
      } finally {
        if (!cancelled) setManualLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const resolveToken = useCallback(async () => {
    const clerkToken = await getToken();
    if (clerkToken?.trim()) return clerkToken.trim();

    const local = manualToken.trim();
    if (local) return local;

    try {
      const stored = (await getStoredString(MANUAL_KEY)) ?? "";
      if (stored.trim()) return stored.trim();
    } catch {
      /* ignore */
    }

    throw new Error(
      "Sign in with Clerk or paste a bearer token in Account."
    );
  }, [getToken, manualToken]);

  const api = useCallback(
    async (path: string, method = "GET", body?: unknown) => {
      const token = await resolveToken();
      return providerApiRequest(token, path, method, body);
    },
    [resolveToken]
  );

  const saveManualToken = useCallback(async () => {
    const t = manualToken.trim();
    if (t) {
      await setStoredString(MANUAL_KEY, t);
    } else {
      await removeStoredString(MANUAL_KEY);
    }
  }, [manualToken]);

  const clearManualToken = useCallback(async () => {
    setManualToken("");
    setStoredTokenPresent(false);
    await removeStoredString(MANUAL_KEY);
  }, []);

  const canCallApis =
    manualLoaded &&
    (isSignedIn ||
      manualToken.trim().length > 0 ||
      storedTokenPresent);

  return {
    api,
    resolveToken,
    manualToken,
    setManualToken,
    saveManualToken,
    clearManualToken,
    isSignedIn,
    manualLoaded,
    canCallApis,
  };
}
