create table if not exists public.ai_proactive_settings (
  ai_id text primary key,
  ai_name text not null default '小屋 AI',
  enabled boolean not null default false,
  level text not null default 'natural',
  start_hour int not null default 8,
  end_hour int not null default 23,
  min_interval_minutes int not null default 120,
  last_sent_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_push_subscriptions (
  endpoint text primary key,
  ai_id text not null default 'default',
  subscription jsonb not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
