# Korean Online Handwriting Stroke Data Collection

A research data-collection web app for building a future **online Korean handwriting recognition** dataset.

This is **not** an OCR or handwriting-recognition product. It exists solely to collect two forms of data from
stylus users, for later use in ML research:

1. **Raw stroke-event sequences** (primary dataset) — every pointer-down/move/up event with position, pressure,
   tilt, twist, and timing.
2. **PNG renders** of the handwriting (secondary dataset) — for visualization and possible future image-based
   experiments.

No personal identifiers (name, email, phone, student ID) are ever collected. Participants are identified only by an
anonymous, randomly generated writer code.

## Architecture

**Vercel + Supabase only — no separate backend server.** The React frontend writes directly to Supabase (Postgres +
Storage) using the public anon key; there is nothing else to host or keep running.

```
frontend/    React + TypeScript + Vite — the entire application
supabase/    SQL migrations (schema, storage bucket, RLS policies)
backend/     Optional FastAPI backend (not used by the current deployment — see below)
```

### How writes are secured without a backend

The anon key is public (it ships in the browser bundle) and Postgres Row Level Security is the only thing
standing between it and the database. The policies in
[`supabase/migrations/0003_anon_write_policies.sql`](supabase/migrations/0003_anon_write_policies.sql) grant the
anon role **INSERT only** — never SELECT, UPDATE, or DELETE — on `writers`, `samples`, and the `handwriting`
storage bucket:

- **No SELECT**: nobody holding the anon key (i.e. anyone who opens devtools on the deployed site) can read back
  any participant's data, list writers, or enumerate samples.
- **No UPDATE/DELETE**: submitted data cannot be modified or destroyed via the anon key.
- Data can only be browsed, exported, or deleted using the Supabase **service_role** key — i.e. through the
  Supabase Studio dashboard (Table Editor / SQL editor), which only the project owner can access.

**Why there's no upsert/retry-via-update:** Postgres actually requires a SELECT-type policy just to make
*existing* rows visible to an UPDATE's row scan — a `FOR UPDATE ... USING (true)` policy's own `USING` clause
does **not** grant that visibility on its own. Since granting SELECT would let the anon key read every
participant's raw handwriting data, retries are instead made idempotent at the application level
([`frontend/src/lib/supabaseUpload.ts`](frontend/src/lib/supabaseUpload.ts)):

- Re-submitting a `writers`/`samples` row that a previous attempt already wrote hits a unique-constraint conflict,
  which is treated as success (the participant can't edit their answers or strokes from the retry screen, so a
  retry is always byte-identical to the original attempt).
- Every upload attempt writes PNGs to a **fresh, uniquely-suffixed path** rather than overwriting a previous one
  (Storage's overwrite path has the same visibility requirement as SQL UPDATE). A retry after a partial failure
  may leave one harmless orphaned PNG from the earlier attempt in Storage; the sample row that ends up written
  always points at a real, successfully-uploaded PNG.

### Browsing / exporting the collected data

There is no built-in admin dashboard. Use the **Supabase Studio** dashboard for your project:

- **Table Editor** to browse `writers` and `samples`, or run SQL in the **SQL Editor**.
- **Storage** to preview/download PNGs from the `handwriting` bucket.
- Table Editor's "Export" button (or a `SELECT` in the SQL editor + copy/download) to get CSV/JSON dumps.

### Optional: `backend/` (FastAPI)

An earlier iteration of this project included a full FastAPI backend (server-side validation, Supabase Storage
upload, admin dashboard API with its own auth) — it's fully built and tested, but **not used by the current
Vercel+Supabase deployment**. It's kept in the repo as an alternative if you later want server-side validation, a
private admin API, or don't want the anon key exposed client-side. See `backend/` for its own setup — it targets
the same Postgres schema (`supabase/migrations/0001_init.sql` and `0002_storage_bucket.sql`), just not the
anon-write policies in `0003`.

## Data flow

Landing → Consent → Participant Info → Handwriting Collection (3 sentences × 2 styles = 6 samples) → Upload →
Thank You.

Each of the 3 fixed sentences is written twice: once "neatly" and once at the participant's "regular" writing
speed, each on its own single-line canvas (1400×160 logical px, horizontally scrollable on mobile, never shrunk).
The canvas only accepts `pointerType === "pen"` — touch and mouse input are ignored entirely (there's no separate
stylus-test gate; the writing canvases themselves reject touch/mouse).

In-progress work is persisted to **IndexedDB** as the participant writes, so a page refresh recovers unfinished
strokes automatically. The local copy is only cleared after a **successful** upload; a failed upload can always be
retried without losing data.

## Local development

### Prerequisites

- Node.js 20+
- A Supabase project (Postgres + Storage)

### 1. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Run the SQL migrations in `supabase/migrations/` (in order) via the Supabase SQL editor:
   - `0001_init.sql` creates the `writers` and `samples` tables with RLS enabled and no policies yet.
   - `0002_storage_bucket.sql` creates the private `handwriting` storage bucket.
   - `0003_anon_write_policies.sql` grants the anon role insert-only access (see above).
3. From **Project Settings → API**, copy the Project URL and the **legacy `anon` / `anon public` JWT key**
   (a long `eyJ...` token). Note: if your project only shows the newer `sb_publishable_...` key format, that key
   did not correctly resolve to the `anon` Postgres role for INSERT requests when this was built — use the
   legacy JWT-style anon key instead (Project Settings → API should show both if legacy keys are enabled for the
   project).

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

Open http://localhost:5173. A stylus (pen input device) is required to draw on the handwriting canvases — touch
and mouse input are intentionally rejected there.

Run tests: `npm test`. Type-check + production build: `npm run build`.

## Docker

```bash
docker compose up --build
```

Builds and serves the frontend (nginx, port 5173) with the `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`
environment variables passed through as build args. Supabase remains the remote backend — there's nothing else to
run.

## Deployment (Vercel)

Import the `frontend/` directory as the Vercel project root, set the environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (the legacy anon JWT key, per the note above)

then deploy. `frontend/vercel.json` rewrites all routes to `index.html` for client-side routing.

## Data model

**`writers`**: `id`, `anonymous_code`, `korean_background`, `learning_duration`, `proficiency`, `consent`, `created_at`.

**`samples`**: `id`, `writer_id`, `sentence_number` (1–3), `writing_style` (`neat`/`regular`), `stroke_json`
(JSONB — array of strokes, each an array of points), `png_path`, `canvas_width`, `canvas_height`, `stroke_count`,
`point_count`, `duration_ms`, `bounding_box` (JSONB), `created_at`.

Each stroke point:

```json
{
  "x": 120, "y": 91, "timestamp": 15234.2, "relative_time": 812.4,
  "pressure": 0.71, "tiltX": 12, "tiltY": -4, "twist": 0,
  "pointerType": "pen", "stroke_id": 3, "event": "move"
}
```

## Notes for future recognition-model work

- Stroke coordinates are in the canvas's logical coordinate space (`canvas_width` × `canvas_height`, currently
  1400×160), independent of device pixel ratio — safe to use directly as (x, y, t) sequences.
- `stroke_id` groups points into pen-down-to-pen-up strokes within a sample; `event` marks `down`/`move`/`up`.
- PNGs are rendered at native device pixel ratio with a white background and black ink only — no guideline, no
  prompt text, no UI chrome.
- Client-side validation (`frontend/src/lib/validation.ts`) is the only integrity gate on submitted data in this
  deployment (there's no backend to re-validate) — keep this in mind if the dataset is ever exposed to untrusted
  submitters.
