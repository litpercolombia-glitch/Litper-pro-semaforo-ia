-- ══════════════════════════════════════════════════════════════
-- LITPERPRO — SUPABASE SCHEMA v1.0
-- Correr en: Supabase Dashboard → SQL Editor → New query
-- ══════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- ── ORGANIZATIONS ─────────────────────────────────────────────
create table public.organizations (
  id         uuid default uuid_generate_v4() primary key,
  name       text not null,
  slug       text unique not null,
  plan       text default 'starter' check (plan in ('starter','pro','enterprise')),
  country    text default 'CO',
  ai_quota   int  default 0,
  ai_used    int  default 0,
  created_at timestamptz default now()
);

-- ── PROFILES (una fila por usuario de Supabase Auth) ──────────
create table public.profiles (
  id         uuid references auth.users primary key,
  org_id     uuid references public.organizations,
  email      text not null,
  full_name  text,
  role       text default 'admin' check (role in ('admin','editor','viewer')),
  created_at timestamptz default now()
);

-- ── UPLOADS (cada Excel subido) ───────────────────────────────
create table public.uploads (
  id             uuid default uuid_generate_v4() primary key,
  org_id         uuid references public.organizations not null,
  user_id        uuid references public.profiles,
  filename       text not null,
  total_orders   int,
  delivered      int,
  returned       int,
  delivery_rate  numeric(5,2),
  cities_count   int,
  carriers_count int,
  period_start   date,
  period_end     date,
  created_at     timestamptz default now()
);
create index on public.uploads(org_id, created_at desc);

-- ── CITY_STATS (semaforo de ciudades por upload) ──────────────
create table public.city_stats (
  id                uuid default uuid_generate_v4() primary key,
  upload_id         uuid references public.uploads on delete cascade,
  org_id            uuid references public.organizations,
  city              text not null,
  total             int  default 0,
  delivered         int  default 0,
  returned          int  default 0,
  rate              numeric(5,2) default 0,
  semaforo          text generated always as (
    case when rate>=80.5 then 'verde'
         when rate>=70   then 'amarillo'
         else 'rojo' end
  ) stored,
  best_carrier      text,
  carrier_breakdown jsonb default '{}'
);
create index on public.city_stats(upload_id);
create index on public.city_stats(org_id, semaforo);
create index on public.city_stats(rate);

-- ── CARRIER_STATS (scorecard por upload) ─────────────────────
create table public.carrier_stats (
  id        uuid default uuid_generate_v4() primary key,
  upload_id uuid references public.uploads on delete cascade,
  org_id    uuid references public.organizations,
  carrier   text not null,
  total     int  default 0,
  delivered int  default 0,
  returned  int  default 0,
  rate      numeric(5,2) default 0,
  cpa_cop   int  generated always as (
    case when rate > 0 then round(15000::numeric / (rate/100)) else null end
  ) stored
);
create index on public.carrier_stats(upload_id);

-- ── AI_ANALYSES (historial de analisis IA) ────────────────────
create table public.ai_analyses (
  id          uuid default uuid_generate_v4() primary key,
  org_id      uuid references public.organizations,
  user_id     uuid references public.profiles,
  upload_id   uuid references public.uploads,
  model       text not null check (model in ('gemini','claude','chatgpt')),
  type        text not null,
  prompt      text,
  response    text,
  duration_ms int,
  created_at  timestamptz default now()
);
create index on public.ai_analyses(org_id, created_at desc);

-- ── CHAT_SESSIONS (historial del chatbot) ─────────────────────
create table public.chat_sessions (
  id          uuid default uuid_generate_v4() primary key,
  org_id      uuid references public.organizations,
  user_id     uuid references public.profiles,
  upload_id   uuid references public.uploads,
  model       text default 'gemini',
  title       text,
  messages    jsonb default '[]',
  msg_count   int  default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index on public.chat_sessions(org_id, updated_at desc);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
alter table public.organizations  enable row level security;
alter table public.profiles        enable row level security;
alter table public.uploads         enable row level security;
alter table public.city_stats      enable row level security;
alter table public.carrier_stats   enable row level security;
alter table public.ai_analyses     enable row level security;
alter table public.chat_sessions   enable row level security;

-- Helper: get org_id del usuario actual
create or replace function public.my_org_id()
returns uuid language sql security definer stable as
$$ select org_id from public.profiles where id = auth.uid() $$;

-- Policies: cada usuario ve SOLO datos de su organizacion
create policy "own org" on public.organizations  for all using (id = my_org_id());
create policy "own org" on public.profiles        for all using (org_id = my_org_id());
create policy "own org" on public.uploads         for all using (org_id = my_org_id());
create policy "own org" on public.city_stats      for all using (org_id = my_org_id());
create policy "own org" on public.carrier_stats   for all using (org_id = my_org_id());
create policy "own org" on public.ai_analyses     for all using (org_id = my_org_id());
create policy "own org" on public.chat_sessions   for all using (org_id = my_org_id());

-- ── TRIGGER: crear profile al registrarse ─────────────────────
create or replace function public.on_new_user()
returns trigger language plpgsql security definer as $$
declare
  new_org_id uuid;
begin
  -- Crear organizacion personal
  insert into public.organizations (name, slug, plan, ai_quota)
  values (
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    lower(replace(split_part(new.email,'@',1),' ','-')) || '-' || substr(new.id::text,1,6),
    'starter',
    10
  ) returning id into new_org_id;

  -- Crear perfil
  insert into public.profiles (id, org_id, email, full_name, role)
  values (
    new.id,
    new_org_id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    'admin'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.on_new_user();

-- ── SEED: org Litper ──────────────────────────────────────────
insert into public.organizations (id, name, slug, plan, country, ai_quota)
values ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','Litper Group LLC','litper','pro','CO',100)
on conflict do nothing;
