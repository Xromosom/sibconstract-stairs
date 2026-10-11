-- Выполнить один раз в Supabase → SQL Editor.
-- Сметы доступны только владельцу CRM после входа в Supabase Auth.
create table if not exists public.estimates (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id),
 title text not null,
 customer text not null default '',
 data jsonb not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.estimates enable row level security;
revoke all on public.estimates from anon;
grant select, insert, update, delete on public.estimates to authenticated;
drop policy if exists "estimates_admin_select" on public.estimates;
drop policy if exists "estimates_admin_insert" on public.estimates;
drop policy if exists "estimates_admin_update" on public.estimates;
drop policy if exists "estimates_admin_delete" on public.estimates;
create policy "estimates_admin_select" on public.estimates for select to authenticated using (auth.uid() = '0c6a89e0-6a99-4549-b179-cc87aae46880'::uuid and owner_id=auth.uid());
create policy "estimates_admin_insert" on public.estimates for insert to authenticated with check (auth.uid() = '0c6a89e0-6a99-4549-b179-cc87aae46880'::uuid and owner_id=auth.uid());
create policy "estimates_admin_update" on public.estimates for update to authenticated using (auth.uid() = '0c6a89e0-6a99-4549-b179-cc87aae46880'::uuid and owner_id=auth.uid()) with check (auth.uid() = '0c6a89e0-6a99-4549-b179-cc87aae46880'::uuid and owner_id=auth.uid());
create policy "estimates_admin_delete" on public.estimates for delete to authenticated using (auth.uid() = '0c6a89e0-6a99-4549-b179-cc87aae46880'::uuid and owner_id=auth.uid());
