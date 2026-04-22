-- Idempotent migration: tracks pre-generation status for all PDF types
-- Run once via Supabase SQL editor or migration runner.

create table if not exists pdf_generation_status (
  id              uuid primary key default gen_random_uuid(),
  assessment_id   uuid not null,
  pdf_type        text not null check (pdf_type in ('main_report','plan_activity','plan_metabolic','plan_recovery','plan_stress')),
  locale          text not null,
  status          text not null default 'pending' check (status in ('pending','generating','ready','failed')),
  storage_path    text,          -- bucket path once ready
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (assessment_id, pdf_type, locale)
);

-- Auto-update updated_at
create or replace function set_pdf_gen_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_pdf_gen_updated_at on pdf_generation_status;
create trigger trg_pdf_gen_updated_at
  before update on pdf_generation_status
  for each row execute procedure set_pdf_gen_updated_at();
