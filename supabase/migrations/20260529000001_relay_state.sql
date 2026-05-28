-- Singleton table polled by the hardware relay controller (ESP32)
create table if not exists relay_state (
  id   int  primary key default 1,
  pump bool not null default false,
  uv   bool not null default false
);

-- Ensure exactly one row exists
insert into relay_state (id, pump, uv)
values (1, false, false)
on conflict (id) do nothing;

-- Public read+write: hardware uses anon key, app uses authenticated session
alter table relay_state enable row level security;

create policy "public"
  on relay_state for all
  using (true)
  with check (true);
