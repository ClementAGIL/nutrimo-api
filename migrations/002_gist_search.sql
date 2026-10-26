-- Search speed: a GiST trigram index supports nearest-neighbour ordering (<<->), so a search ranks only the
-- closest few hundred names instead of sorting every match (GIN made "pomme" take > 1 s on 800k products).
drop index if exists foods_search_trgm;
create index if not exists foods_search_gist on foods using gist (search_text gist_trgm_ops);
-- Fast prefix lookups for very short queries.
create index if not exists foods_search_prefix on foods (search_text text_pattern_ops);
analyze foods;
