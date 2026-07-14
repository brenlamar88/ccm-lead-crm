-- Apply in the Supabase SQL editor (or via MCP) to enable SDR activity tracking,
-- the dashboard, and the weekly report. Idempotent.

-- When a lead's pipeline stage last changed (for weekly won/lost reporting).
alter table leads add column if not exists status_changed_at timestamptz;
update leads set status_changed_at = created_at where status_changed_at is null;

-- Contact activity / touchpoints logged by Service Development Reps.
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),          -- time it was input
  occurred_at timestamptz default now(),         -- when the contact happened
  lead_id uuid references leads(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null,
  rep_id uuid references profiles(id) on delete set null,   -- the SDR
  type text check (type in ('Call','Email','Text','Voicemail','Meeting','LinkedIn','Other')),
  notes text,
  next_action text,
  followup_date date,
  followup_done boolean default false
);

create index if not exists activities_rep_idx on activities(rep_id);
create index if not exists activities_lead_idx on activities(lead_id);
create index if not exists activities_occurred_idx on activities(occurred_at);
create index if not exists activities_followup_idx on activities(followup_date);

alter table activities enable row level security;
drop policy if exists "allow all" on activities;
create policy "allow all" on activities for all using (true) with check (true);
