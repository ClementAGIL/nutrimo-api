-- Backups of the phone's personal data (the app's JSON export), so a lost or changed phone can be restored.
create table if not exists backups (
  id serial primary key,
  device text not null,
  created_at timestamptz not null default now(),
  size integer not null,
  data jsonb not null
);
create index if not exists backups_device_created on backups (device, created_at desc);
