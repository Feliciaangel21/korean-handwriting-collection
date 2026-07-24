import { useCallback, useEffect, useRef, useState } from "react";
import { deleteSession, loadSession, saveSession } from "../lib/indexedDb";
import type { CollectionSession } from "../lib/types";

const SAVE_DEBOUNCE_MS = 400;

interface UseIndexedDbRecoveryResult {
  recoveredSession: CollectionSession | null;
  isLoading: boolean;
  persist: (session: CollectionSession) => void;
  clear: () => Promise<void>;
}

/**
 * Loads any in-progress session for this writer on mount (so a page refresh
 * mid-collection recovers strokes automatically) and debounces writes back
 * to IndexedDB as the session changes. The local copy is only deleted after
 * a successful upload.
 */
export function useIndexedDbRecovery(anonymousCode: string): UseIndexedDbRecoveryResult {
  const [recoveredSession, setRecoveredSession] = useState<CollectionSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    loadSession(anonymousCode).then((session) => {
      if (cancelled) return;
      setRecoveredSession(session ?? null);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [anonymousCode]);

  const persist = useCallback((session: CollectionSession) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      void saveSession(session);
    }, SAVE_DEBOUNCE_MS);
  }, []);

  const clear = useCallback(async () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    await deleteSession(anonymousCode);
  }, [anonymousCode]);

  return { recoveredSession, isLoading, persist, clear };
}
