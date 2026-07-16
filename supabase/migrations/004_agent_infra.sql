-- ══════════════════════════════════════════════════════════════
-- LITPERPRO — AGENT INFRASTRUCTURE v1.0
-- Tablas para el sistema agéntico: eventos, runs, y pedidos COD
-- ══════════════════════════════════════════════════════════════

-- ── AGENT_EVENTS (log inmutable de todo lo que hace un agente) ──
create table public.agent_events (
  id          uuid default uuid_generate_v4() primary key,
  org_id      uuid references public.organizations not null,
  agent_name  text not null,
  run_id      uuid not null,
  event_type  text not null, -- 'start' | 'tool_call' | 'decision' | 'complete' | 'error'
  payload     jsonb default '{}',
  created_at  timestamptz default now()
);
create index on public.agent_events(org_id, agent_name, created_at desc);
create index on public.agent_events(run_id);

-- ── AGENT_RUNS (cada ejecución de un agente) ───────────────────
create table public.agent_runs (
  id           uuid default uuid_generate_v4() primary key,
  org_id       uuid references public.organizations not null,
  agent_name   text not null,
  status       text default 'running' check (status in ('running','completed','failed','pending_human')),
  input        jsonb default '{}',
  output       jsonb default '{}',
  tokens_used  int  default 0,
  duration_ms  int,
  triggered_by text default 'manual', -- 'manual' | 'schedule' | 'webhook'
  created_at   timestamptz default now(),
  completed_at timestamptz
);
create index on public.agent_runs(org_id, agent_name, created_at desc);

-- ── COD_ORDERS (pedidos cargados para confirmación WhatsApp) ───
create table public.cod_orders (
  id              uuid default uuid_generate_v4() primary key,
  org_id          uuid references public.organizations not null,
  upload_id       uuid references public.uploads,
  order_ref       text not null,          -- referencia interna del pedido
  customer_name   text,
  customer_phone  text not null,          -- +57XXXXXXXXXX
  city            text,
  carrier         text,
  product         text,
  amount_cop      int,
  confirmation_status text default 'pending'
    check (confirmation_status in ('pending','confirmed','reschedule','rejected','no_response','blocked')),
  whatsapp_sent_at   timestamptz,
  customer_replied_at timestamptz,
  customer_reply  text,
  risk_score      numeric(3,2) default 0, -- 0–1: prob de devolución
  agent_notes     text,
  dispatch_blocked boolean default false, -- el agente bloqueó despacho
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index on public.cod_orders(org_id, confirmation_status, created_at desc);
create index on public.cod_orders(org_id, customer_phone);

-- ── RLS ────────────────────────────────────────────────────────
alter table public.agent_events enable row level security;
alter table public.agent_runs   enable row level security;
alter table public.cod_orders   enable row level security;

-- Política: cada org solo ve sus propios datos
create policy "org_isolation_events" on public.agent_events
  using (org_id = (select org_id from public.auth_profiles where id = auth.uid()));

create policy "org_isolation_runs" on public.agent_runs
  using (org_id = (select org_id from public.auth_profiles where id = auth.uid()));

create policy "org_isolation_orders" on public.cod_orders
  using (org_id = (select org_id from public.auth_profiles where id = auth.uid()));

-- Service role bypasses RLS (para los agentes en backend)
create policy "service_full_access_events" on public.agent_events
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "service_full_access_runs" on public.agent_runs
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "service_full_access_orders" on public.cod_orders
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
