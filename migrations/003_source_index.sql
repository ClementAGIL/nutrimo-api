-- Search always ranks the matching CIQUAL foods (~2,300 rows) alongside the nearest neighbours: index them by source.
create index if not exists foods_source on foods (source);
