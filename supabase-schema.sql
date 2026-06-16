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
  assigned_to uuid references profiles(id) on delete set null,
  notes text
);

-- User profiles with roles (admin/member). Mirrors auth.users.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "profiles readable" on profiles for select using (true);

-- Auto-create a member profile when a new auth user signs up.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'member')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Companies (accounts) and Contacts (people).
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  type text,
  website text,
  phone text,
  email text,
  address text,
  city text,
  state text,
  zip text,
  npi text,
  provider_count int,
  patient_volume text,
  medicare_likelihood text,
  fit_score text,
  fit_rationale text,
  notes text,
  assigned_to uuid references profiles(id) on delete set null
);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  company_id uuid references companies(id) on delete cascade,
  first_name text,
  last_name text,
  title text,
  email text,
  phone text,
  mobile text,
  is_primary boolean default false,
  notes text,
  assigned_to uuid references profiles(id) on delete set null
);

alter table companies enable row level security;
alter table contacts enable row level security;
create policy "allow all" on companies for all using (true) with check (true);
create policy "allow all" on contacts for all using (true) with check (true);

-- leads.company_id / leads.contact_id link each pipeline deal to its account.

-- Enable RLS but allow all for now (add auth later)
alter table lead_runs enable row level security;
alter table leads enable row level security;

create policy "allow all" on lead_runs for all using (true) with check (true);
create policy "allow all" on leads for all using (true) with check (true);
