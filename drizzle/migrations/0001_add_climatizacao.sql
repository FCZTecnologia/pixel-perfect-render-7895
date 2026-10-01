alter table public.consumption add column hvac_prev numeric not null default 0;
alter table public.consumption add column hvac_curr numeric not null default 0;