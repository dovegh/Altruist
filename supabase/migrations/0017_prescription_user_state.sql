-- 0017 — Archive and remove prescriptions from your own list.
--
-- A prescription is a health record the pharmacy is required to keep, so the
-- patient never deletes the row in `prescriptions`. What they own is how it
-- shows up for them: archived (tucked under "Archived", can come back) or
-- hidden (gone from their list). That state lives here, one row per
-- prescription, and nothing the pharmacy reads depends on it.

create table if not exists public.prescription_user_state (
  prescription_id text primary key references public.prescriptions(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  archived_at     timestamptz,
  hidden_at       timestamptz,
  updated_at      timestamptz not null default now()
);
create index if not exists prescription_user_state_user_idx
  on public.prescription_user_state (user_id);

alter table public.prescription_user_state enable row level security;

revoke all on public.prescription_user_state from anon, authenticated;
grant select, insert, update, delete on public.prescription_user_state to authenticated;

drop policy if exists "own state: read" on public.prescription_user_state;
create policy "own state: read" on public.prescription_user_state
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Writes must be about a prescription that is actually yours.
drop policy if exists "own state: insert" on public.prescription_user_state;
create policy "own state: insert" on public.prescription_user_state
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.prescriptions p
      where p.id = prescription_id and p.user_id = (select auth.uid())
    )
  );

drop policy if exists "own state: update" on public.prescription_user_state;
create policy "own state: update" on public.prescription_user_state
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.prescriptions p
      where p.id = prescription_id and p.user_id = (select auth.uid())
    )
  );

drop policy if exists "own state: delete" on public.prescription_user_state;
create policy "own state: delete" on public.prescription_user_state
  for delete to authenticated
  using (user_id = (select auth.uid()));
