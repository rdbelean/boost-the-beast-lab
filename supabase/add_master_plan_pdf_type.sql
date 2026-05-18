-- Adds 'plan_master' to the allowed pdf_type values on pdf_generation_status.
-- Idempotent: drops the old CHECK constraint (whatever its name is) and
-- recreates it with the extended set. Safe to run multiple times.

do $$
declare
  cons_name text;
begin
  -- Find the existing CHECK constraint on pdf_type (Postgres auto-names it
  -- something like pdf_generation_status_pdf_type_check on most installs,
  -- but we look it up by definition to stay robust across environments).
  select conname into cons_name
    from pg_constraint
   where conrelid = 'pdf_generation_status'::regclass
     and contype  = 'c'
     and pg_get_constraintdef(oid) ilike '%pdf_type%in%';

  if cons_name is not null then
    execute format('alter table pdf_generation_status drop constraint %I', cons_name);
  end if;

  alter table pdf_generation_status
    add constraint pdf_generation_status_pdf_type_check
    check (pdf_type in (
      'main_report',
      'plan_activity',
      'plan_metabolic',
      'plan_recovery',
      'plan_stress',
      'plan_master'
    ));
end$$;
