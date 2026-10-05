-- Row level security and Data API privileges (SPEC §18).

alter table public.categories       enable row level security;
alter table public.vocabulary_cards enable row level security;

-- Explicit, least-privilege grants: do not rely on the project's default privileges
-- (Supabase is making Data API exposure opt-in). No DELETE: soft deletes only.
revoke all on public.categories, public.vocabulary_cards from anon, authenticated;
grant select, insert, update on public.categories, public.vocabulary_cards to authenticated;

-- categories
drop policy if exists categories_select on public.categories;
drop policy if exists categories_insert on public.categories;
drop policy if exists categories_update on public.categories;
create policy categories_select on public.categories
  for select to authenticated using (user_id = (select auth.uid()));
create policy categories_insert on public.categories
  for insert to authenticated with check (user_id = (select auth.uid()) and is_system = false);
create policy categories_update on public.categories
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- no delete policy: hard deletes impossible

-- vocabulary_cards
drop policy if exists cards_select on public.vocabulary_cards;
drop policy if exists cards_insert on public.vocabulary_cards;
drop policy if exists cards_update on public.vocabulary_cards;
create policy cards_select on public.vocabulary_cards
  for select to authenticated using (user_id = (select auth.uid()));
create policy cards_insert on public.vocabulary_cards
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy cards_update on public.vocabulary_cards
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- no delete policy: soft delete only
