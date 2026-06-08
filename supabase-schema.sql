-- Run this in your Supabase SQL editor

create table if not exists lead_runs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  city text not null,
  state text not null,
  practice_type text,
  lead_count int,
  value_prop text
);

create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  run_id uuid references lead_runs(id) on delete cascade,
  name text,
  address text,
  phone text,
  email text,
  website text,
  npi text,
  provider_count int,
  patient_volume text,
  medicare_likelihood text,
  fit_score text,
  fit_rationale text,
  decision_maker text,
  outreach_email text,
  status text default 'New' check (status in ('New', 'Contacted', 'Demo Scheduled', 'Closed Won', 'Closed Lost')),
  direction text default 'Outbound' check (direction in ('Inbound', 'Outbound')),
  temperature text default 'Cold' check (temperature in ('Cold', 'Warm', 'Hot')),
  notes text
);

-- Enable RLS but allow all for now (add auth later)
alter table lead_runs enable row level security;
alter table leads enable row level security;

create policy "allow all" on lead_runs for all using (true) with check (true);
create policy "allow all" on leads for all using (true) with check (true);
