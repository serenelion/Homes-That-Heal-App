create extension if not exists "uuid-ossp";

-- Helper to scope requests by client-provided device id for no-auth prototype
create or replace function public.current_device_id()
returns text
language sql
as $$
  select coalesce(
    nullif(current_setting('request.headers', true)::jsonb ->> 'x-device-id', ''),
    nullif(current_setting('request.jwt.claim.device_id', true), '')
  );
$$;

create table if not exists public.scan_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  device_id text,
  name text not null,
  status text not null default 'onboarding' check (status in ('onboarding','scanning','processing','balancing','complete')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scan_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.scan_projects(id) on delete cascade,
  step text not null,
  storage_path text not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.scan_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.scan_projects(id) on delete cascade,
  type text not null,
  payload_json jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.recon_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.scan_projects(id) on delete cascade,
  provider text not null default 'kiri',
  provider_job_id text,
  status text not null default 'queued' check (status in ('queued','uploading','processing','complete','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.models (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.scan_projects(id) on delete cascade,
  glb_url text,
  created_at timestamptz not null default now()
);

-- update timestamp triggers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_scan_projects_updated_at on public.scan_projects;
create trigger set_scan_projects_updated_at
  before update on public.scan_projects
  for each row execute function public.set_updated_at();

drop trigger if exists set_recon_jobs_updated_at on public.recon_jobs;
create trigger set_recon_jobs_updated_at
  before update on public.recon_jobs
  for each row execute function public.set_updated_at();

-- Indexes
create index if not exists scan_assets_project_id_idx on public.scan_assets(project_id);
create index if not exists scan_events_project_id_idx on public.scan_events(project_id);
create index if not exists recon_jobs_project_id_idx on public.recon_jobs(project_id);
create index if not exists models_project_id_idx on public.models(project_id);
create index if not exists scan_projects_device_idx on public.scan_projects(device_id);

-- Storage bucket for photos
insert into storage.buckets (id, name, public)
values ('scan-photos', 'scan-photos', false)
on conflict (id) do nothing;

-- RLS
alter table public.scan_projects enable row level security;
alter table public.scan_assets enable row level security;
alter table public.scan_events enable row level security;
alter table public.recon_jobs enable row level security;
alter table public.models enable row level security;

create policy "device owns project"
  on public.scan_projects
  for select using (device_id is not null and device_id = public.current_device_id());

create policy "device can insert project"
  on public.scan_projects
  for insert with check (device_id is not null and device_id = public.current_device_id());

create policy "device can update project"
  on public.scan_projects
  for update using (device_id is not null and device_id = public.current_device_id())
  with check (device_id is not null and device_id = public.current_device_id());

create policy "device scoped assets"
  on public.scan_assets
  for select using (
    exists (
      select 1 from public.scan_projects p
      where p.id = project_id and p.device_id = public.current_device_id()
    )
  );

create policy "device insert assets"
  on public.scan_assets
  for insert with check (
    exists (
      select 1 from public.scan_projects p
      where p.id = project_id and p.device_id = public.current_device_id()
    )
  );

create policy "device scoped events"
  on public.scan_events
  for select using (
    exists (
      select 1 from public.scan_projects p
      where p.id = project_id and p.device_id = public.current_device_id()
    )
  );

create policy "device insert events"
  on public.scan_events
  for insert with check (
    exists (
      select 1 from public.scan_projects p
      where p.id = project_id and p.device_id = public.current_device_id()
    )
  );

create policy "device scoped recon jobs"
  on public.recon_jobs
  for select using (
    exists (
      select 1 from public.scan_projects p
      where p.id = project_id and p.device_id = public.current_device_id()
    )
  );

create policy "device insert recon jobs"
  on public.recon_jobs
  for insert with check (
    exists (
      select 1 from public.scan_projects p
      where p.id = project_id and p.device_id = public.current_device_id()
    )
  );

create policy "device update recon jobs"
  on public.recon_jobs
  for update using (
    exists (
      select 1 from public.scan_projects p
      where p.id = project_id and p.device_id = public.current_device_id()
    )
  )
  with check (
    exists (
      select 1 from public.scan_projects p
      where p.id = project_id and p.device_id = public.current_device_id()
    )
  );

create policy "device scoped models"
  on public.models
  for select using (
    exists (
      select 1 from public.scan_projects p
      where p.id = project_id and p.device_id = public.current_device_id()
    )
  );

create policy "device insert models"
  on public.models
  for insert with check (
    exists (
      select 1 from public.scan_projects p
      where p.id = project_id and p.device_id = public.current_device_id()
    )
  );

alter table storage.objects enable row level security;

create policy "device scoped storage"
  on storage.objects
  for select using (
    bucket_id = 'scan-photos'
    and public.current_device_id() is not null
    and split_part(name, '/', 1) = public.current_device_id()
  );

create policy "device insert storage"
  on storage.objects
  for insert with check (
    bucket_id = 'scan-photos'
    and public.current_device_id() is not null
    and split_part(name, '/', 1) = public.current_device_id()
  );

create policy "device update storage"
  on storage.objects
  for update using (
    bucket_id = 'scan-photos'
    and public.current_device_id() is not null
    and split_part(name, '/', 1) = public.current_device_id()
  )
  with check (
    bucket_id = 'scan-photos'
    and public.current_device_id() is not null
    and split_part(name, '/', 1) = public.current_device_id()
  );

create policy "device delete storage"
  on storage.objects
  for delete using (
    bucket_id = 'scan-photos'
    and public.current_device_id() is not null
    and split_part(name, '/', 1) = public.current_device_id()
  );
