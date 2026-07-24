-- Private storage bucket for handwriting PNG renders.
-- Kept private (public = false): PNGs are only ever accessed via short-lived
-- signed URLs minted by the backend (service role), never by public URL.

insert into storage.buckets (id, name, public)
values ('handwriting', 'handwriting', false)
on conflict (id) do nothing;

-- No storage.objects policies are added for anon/authenticated: only the
-- service_role key (backend only) can read/write objects in this bucket.
