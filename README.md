# Korean Handwriting Data Collection

A simple web app for collecting Korean handwriting data with a stylus, for future handwriting-recognition
research.

It is **not** a handwriting recognition tool — it only collects data. For each participant it records:

1. **Stroke data** — every pen movement (position, pressure, timing) as raw JSON.
2. **PNG images** — a picture of the handwriting, for visualization.

No name, email, or other personal info is collected — each participant just gets a random anonymous ID.

## How it works

The app is a single React app (no separate backend server). It writes straight to a Supabase project
(Postgres database + file storage), using a public key that's locked down to "insert only" — so the app can save
new data, but nothing (including the app itself) can read, edit, or delete existing data. To browse or export the
collected data, use the Supabase dashboard directly.

## The flow

Landing page → Consent → Participant info (language background, proficiency) → Handwriting collection (3
sentences, written once neatly and once at normal speed) → Upload → Thank you.

Each writing box only accepts input from an actual stylus/pen — touch and mouse are ignored.

If the page is refreshed mid-session, unfinished writing is recovered automatically (saved locally in the
browser until it's successfully uploaded).

## Running it locally

**1. Set up Supabase**

- Create a project at [supabase.com](https://supabase.com).
- Run the SQL files in `supabase/migrations/` (in order) using the Supabase SQL editor. This creates the
  database tables, a storage bucket for the PNGs, and the access rules described above.
- From **Project Settings → API**, grab the Project URL and the `anon` key.

**2. Run the app**

```bash
cd frontend
npm install
cp .env.example .env   # paste in your Supabase URL and anon key
npm run dev
```

Then open http://localhost:5173.

## Deploying

Deploy the `frontend/` folder to [Vercel](https://vercel.com), setting the same two environment variables
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in the Vercel project settings.

## Project layout

```
frontend/    the whole app (React + TypeScript + Vite)
supabase/    the SQL that sets up the database, storage, and access rules
backend/     an alternative FastAPI backend, not used by default (optional, for later)
```
