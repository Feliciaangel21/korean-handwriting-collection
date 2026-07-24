import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useIndexedDbRecovery } from "../hooks/useIndexedDbRecovery";
import { useWriterId } from "../hooks/useWriterId";
import type { CollectionSession, SampleDraft, SentenceNumber, WriterInfo, WritingStyle } from "../lib/types";
import { sampleKey } from "../lib/types";

interface CollectionContextValue {
  writerId: string;
  writerInfo: WriterInfo;
  setWriterInfo: (update: Partial<Omit<WriterInfo, "id" | "anonymousCode">>) => void;
  samples: Record<string, SampleDraft>;
  setSampleDraft: (sentenceNumber: SentenceNumber, writingStyle: WritingStyle, draft: SampleDraft) => void;
  isRecoveryLoading: boolean;
  hasRecoveredDraft: boolean;
  resetAfterSubmit: () => Promise<void>;
}

const CollectionContext = createContext<CollectionContextValue | null>(null);

export function CollectionProvider({ children }: { children: ReactNode }) {
  const identity = useWriterId();
  const { recoveredSession, isLoading, persist, clear } = useIndexedDbRecovery(identity.anonymousCode);

  const [writerInfo, setWriterInfoState] = useState<WriterInfo>({
    id: identity.id,
    anonymousCode: identity.anonymousCode,
    koreanBackground: null,
    learningDuration: null,
    proficiency: null,
    consent: false,
  });
  const [samples, setSamples] = useState<Record<string, SampleDraft>>({});
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    if (isLoading || hasHydrated) return;
    if (recoveredSession) {
      setWriterInfoState(recoveredSession.writer);
      setSamples(recoveredSession.samples);
    }
    setHasHydrated(true);
  }, [isLoading, hasHydrated, recoveredSession]);

  useEffect(() => {
    if (!hasHydrated) return;
    const session: CollectionSession = { writer: writerInfo, samples, updatedAt: Date.now() };
    persist(session);
  }, [hasHydrated, writerInfo, samples, persist]);

  const value = useMemo<CollectionContextValue>(
    () => ({
      writerId: identity.anonymousCode,
      writerInfo,
      setWriterInfo: (update) => setWriterInfoState((prev) => ({ ...prev, ...update })),
      samples,
      setSampleDraft: (sentenceNumber, writingStyle, draft) =>
        setSamples((prev) => ({ ...prev, [sampleKey(sentenceNumber, writingStyle)]: draft })),
      isRecoveryLoading: isLoading,
      hasRecoveredDraft: Boolean(recoveredSession && Object.keys(recoveredSession.samples).length > 0),
      resetAfterSubmit: async () => {
        await clear();
        const fresh = identity.regenerate();
        setWriterInfoState({
          id: fresh.id,
          anonymousCode: fresh.anonymousCode,
          koreanBackground: null,
          learningDuration: null,
          proficiency: null,
          consent: false,
        });
        setSamples({});
      },
    }),
    [identity, writerInfo, samples, isLoading, recoveredSession, clear],
  );

  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>;
}

export function useCollection(): CollectionContextValue {
  const ctx = useContext(CollectionContext);
  if (!ctx) throw new Error("useCollection must be used within a CollectionProvider");
  return ctx;
}
