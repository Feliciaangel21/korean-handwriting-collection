import { useCallback, useEffect, useState } from "react";
import { WRITER_ID_STORAGE_KEY } from "../lib/constants";

export interface WriterIdentity {
  id: string;
  anonymousCode: string;
}

export interface UseWriterIdResult extends WriterIdentity {
  /** Generates and persists a brand-new identity, for starting a fresh participant session. */
  regenerate: () => WriterIdentity;
}

function generateIdentity(): WriterIdentity {
  const id = crypto.randomUUID();
  const anonymousCode = `W-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  return { id, anonymousCode };
}

/**
 * Returns a stable anonymous writer identity for this browser/tab,
 * generating and persisting one on first use so it survives a page
 * refresh mid-session. No personal identifiers are ever collected —
 * `id` (the Postgres primary key) and `anonymousCode` (the short label
 * shown to the participant) are the only identifiers in the dataset, and
 * both are random and generated entirely client-side.
 *
 * Call `regenerate()` after a successful submission so the next
 * participant on the same device gets a fresh identity — otherwise every
 * subsequent submission would reuse the same writer row/samples and
 * silently no-op on the unique-constraint conflict (see supabaseUpload.ts).
 */
export function useWriterId(): UseWriterIdResult {
  const [identity, setIdentity] = useState<WriterIdentity>(() => {
    const stored = localStorage.getItem(WRITER_ID_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as WriterIdentity;
      } catch {
        // fall through to generate a fresh identity below
      }
    }
    const generated = generateIdentity();
    localStorage.setItem(WRITER_ID_STORAGE_KEY, JSON.stringify(generated));
    return generated;
  });

  useEffect(() => {
    localStorage.setItem(WRITER_ID_STORAGE_KEY, JSON.stringify(identity));
  }, [identity]);

  const regenerate = useCallback(() => {
    const fresh = generateIdentity();
    localStorage.setItem(WRITER_ID_STORAGE_KEY, JSON.stringify(fresh));
    setIdentity(fresh);
    return fresh;
  }, []);

  return { ...identity, regenerate };
}
