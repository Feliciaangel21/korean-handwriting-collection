import { supabase } from "./supabaseClient";
import { sampleKey } from "./types";
import type { SampleDraft, SentenceNumber, WriterInfo, WritingStyle } from "./types";

const STORAGE_BUCKET = "handwriting";
const UNIQUE_VIOLATION = "23505";
const SENTENCE_NUMBERS: SentenceNumber[] = [1, 2, 3];
const WRITING_STYLES: WritingStyle[] = ["neat", "regular"];

export class UploadError extends Error {}

function dataUrlToBlob(dataUrl: string): Blob {
  const [, base64] = dataUrl.split(",", 2);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: "image/png" });
}

function pngPath(
  writerId: string,
  sentenceNumber: SentenceNumber,
  writingStyle: WritingStyle,
  uploadAttemptId: string,
): string {
  return `${writerId}/sentence${sentenceNumber}_${writingStyle}_${uploadAttemptId}.png`;
}

/**
 * The anon key's RLS policies only grant INSERT (no SELECT/UPDATE/DELETE —
 * see supabase/migrations/0003_anon_write_policies.sql), which rules out
 * `.upsert()`/`.update()` entirely: Postgres requires a SELECT-type policy
 * just to make existing rows visible to an UPDATE's row scan, regardless
 * of the UPDATE policy's own USING clause, and granting SELECT would
 * expose every participant's raw handwriting data to the anon key.
 *
 * Instead, retries are made idempotent at the application level: since the
 * participant can't edit their answers or strokes from the upload/retry
 * screen, a retry always resubmits byte-identical data. So a unique-
 * constraint conflict on a row this same writer already wrote in an
 * earlier attempt is treated as success rather than an error.
 */
async function insertIgnoringOwnConflict(table: string, row: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from(table).insert(row);
  if (!error) return;
  if (error.code === UNIQUE_VIOLATION) return; // already written by an earlier attempt — fine
  throw new UploadError(`Failed to save to ${table}: ${error.message}`);
}

/**
 * Uploads a writer's profile and all 6 handwriting samples directly to
 * Supabase (no backend server). PNGs go to Storage first so `png_path`
 * is available for the sample row.
 *
 * Each upload attempt writes PNGs under a fresh, unique path rather than
 * overwriting a previous one, for the same RLS reason described above —
 * Storage's overwrite path (upsert or `.update()`) needs read visibility
 * on `storage.objects` that the anon key doesn't have. A retry after a
 * partial failure may leave a harmless orphaned PNG from the earlier
 * attempt; whichever sample row ends up written points at the latest one.
 */
export async function submitToSupabase(
  writerInfo: WriterInfo,
  samples: Record<string, SampleDraft>,
): Promise<void> {
  if (!writerInfo.koreanBackground || !writerInfo.proficiency) {
    throw new UploadError("Participant profile is incomplete.");
  }

  const writerId = writerInfo.id;
  const uploadAttemptId = crypto.randomUUID().slice(0, 8);

  await insertIgnoringOwnConflict("writers", {
    id: writerId,
    anonymous_code: writerInfo.anonymousCode,
    korean_background: writerInfo.koreanBackground,
    learning_duration: writerInfo.learningDuration,
    proficiency: writerInfo.proficiency,
    consent: writerInfo.consent,
  });

  for (const sentenceNumber of SENTENCE_NUMBERS) {
    for (const writingStyle of WRITING_STYLES) {
      const draft = samples[sampleKey(sentenceNumber, writingStyle)];
      if (!draft || !draft.pngDataUrl) {
        throw new UploadError(`Missing sample for sentence ${sentenceNumber} (${writingStyle}).`);
      }

      const path = pngPath(writerId, sentenceNumber, writingStyle, uploadAttemptId);
      const blob = dataUrlToBlob(draft.pngDataUrl);
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, blob, { contentType: "image/png", upsert: false });
      if (storageError) {
        throw new UploadError(
          `Failed to upload PNG for sentence ${sentenceNumber} (${writingStyle}): ${storageError.message}`,
        );
      }

      await insertIgnoringOwnConflict("samples", {
        writer_id: writerId,
        sentence_number: sentenceNumber,
        writing_style: writingStyle,
        stroke_json: draft.strokes,
        png_path: path,
        canvas_width: draft.canvasWidth,
        canvas_height: draft.canvasHeight,
        stroke_count: draft.strokeCount,
        point_count: draft.pointCount,
        duration_ms: draft.durationMs,
        bounding_box: draft.boundingBox,
      });
    }
  }
}
