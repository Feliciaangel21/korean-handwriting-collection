-- Korean online handwriting stroke data collection
-- Schema: writers (anonymous participants) + samples (6 handwriting samples per writer)

create extension if not exists pgcrypto;

create table if not exists writers (
  id uuid primary key default gen_random_uuid(),
  anonymous_code text unique not null,
  korean_background text not null check (korean_background in ('native', 'heritage', 'learner', 'other')),
  learning_duration text check (
    learning_duration is null or learning_duration in (
      'lt_3_months', '3_6_months', '6_12_months', '1_2_years', '2_3_years', '3_5_years', 'gt_5_years'
    )
  ),
  proficiency text not null check (proficiency in ('beginner', 'intermediate', 'advanced', 'native')),
  consent boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists samples (
  id uuid primary key default gen_random_uuid(),
  writer_id uuid not null references writers(id) on delete cascade,
  sentence_number int not null check (sentence_number in (1, 2, 3)),
  writing_style text not null check (writing_style in ('neat', 'regular')),
  stroke_json jsonb not null,
  png_path text not null,
  canvas_width int not null,
  canvas_height int not null,
  stroke_count int not null,
  point_count int not null,
  duration_ms int not null,
  bounding_box jsonb not null,
  created_at timestamptz not null default now(),
  unique (writer_id, sentence_number, writing_style)
);

create index if not exists samples_writer_id_idx on samples(writer_id);
create index if not exists samples_created_at_idx on samples(created_at desc);
create index if not exists writers_created_at_idx on writers(created_at desc);

-- Row Level Security: the app only ever talks to Postgres via the backend's
-- service role key, so we lock the tables down from the anon/public roles
-- (Supabase's PostgREST layer) and rely entirely on the backend for access.
alter table writers enable row level security;
alter table samples enable row level security;

-- No policies are created for anon/authenticated roles on purpose: only the
-- service_role key (used server-side only) bypasses RLS and can read/write.
