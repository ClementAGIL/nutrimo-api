-- Food table shared by CIQUAL and Open Food Facts; all nutrient values are per 100 g.
create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- unaccent() is only STABLE; an IMMUTABLE wrapper is required to use it in a generated column / index.
create or replace function f_unaccent(text) returns text
  language sql immutable parallel safe strict
  as $$ select public.unaccent('public.unaccent'::regdictionary, $1) $$;

create table if not exists foods (
  id text primary key,
  source text not null,
  name text not null,
  brand text,
  barcode text,
  serving_label text,
  serving_g real,
  kcal real not null,
  fat real,
  sat_fat real,
  carbs real,
  sugars real,
  fiber real,
  protein real,
  salt real,
  micros jsonb not null default '{}',
  popularity integer not null default 0,
  search_text text generated always as (f_unaccent(lower(name || ' ' || coalesce(brand, '')))) stored,
  updated_at timestamptz not null default now()
);

create index if not exists foods_search_trgm on foods using gin (search_text gin_trgm_ops);
create index if not exists foods_barcode on foods (barcode);
