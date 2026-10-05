-- Schema, triggers, seeding, RLS and storage checks (SPEC §8, §17–§19; AC-44, AC-48, AC-55, AC-57).
-- Runs inside a transaction that is rolled back: safe against the linked cloud project.
--   npx supabase@2.119.0 test db --linked
-- Two throwaway users are inserted into auth.users; the owner (and any other real user) is only read.

begin;
-- On the linked project the CLI connects as a temporary login role that cannot use the extensions schema
-- (where pgTAP lives); act as postgres, as the local runner does.
set local role postgres;
set local search_path = public, extensions;
select no_plan();

-- ---------------------------------------------------------------- fixtures (as postgres)

insert into auth.users (id, email, aud, role) values
  ('11111111-1111-4111-8111-111111111111', 'rls-test-1@example.invalid', 'authenticated', 'authenticated'),
  ('22222222-2222-4222-8222-222222222222', 'rls-test-2@example.invalid', 'authenticated', 'authenticated');

-- ---------------------------------------------------------------- structure & privileges

select ok((select relrowsecurity from pg_class where oid = 'public.categories'::regclass), 'RLS enabled on categories');
select ok((select relrowsecurity from pg_class where oid = 'public.vocabulary_cards'::regclass), 'RLS enabled on vocabulary_cards');

select ok(not has_table_privilege('anon', 'public.categories', 'select,insert,update,delete'), 'anon has no privileges on categories');
select ok(not has_table_privilege('anon', 'public.vocabulary_cards', 'select,insert,update,delete'), 'anon has no privileges on vocabulary_cards');
select ok(not has_table_privilege('authenticated', 'public.categories', 'delete'), 'authenticated cannot DELETE categories');
select ok(not has_table_privilege('authenticated', 'public.vocabulary_cards', 'delete'), 'authenticated cannot DELETE cards');
select ok(has_table_privilege('authenticated', 'public.vocabulary_cards', 'select'), 'authenticated can SELECT cards');

select ok(not has_function_privilege('authenticated', 'public.seed_default_categories(uuid)', 'execute'), 'authenticated cannot seed');
select ok(not has_function_privilege('anon', 'public.seed_default_categories(uuid)', 'execute'), 'anon cannot seed');
select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))),
  0::bigint, 'no SECURITY DEFINER function in public is executable by API roles');

select is(
  (select row(public, file_size_limit)::text from storage.buckets where id = 'audio'),
  row(false, 5242880::bigint)::text,
  'audio bucket is private with a 5 MB limit');

-- ---------------------------------------------------------------- seeding (AC-44)

select isnt((select count(*) from auth.users where email not like 'rls-test-%@example.invalid'), 0::bigint,
  'at least one real (owner) user exists');

select is(
  (select count(*) from auth.users u
    where (select count(*) from public.categories c where c.user_id = u.id and c.deleted_at is null) <> 10
       or (select count(*) from public.categories c where c.user_id = u.id and c.is_system) <> 1),
  0::bigint,
  'every user has 10 categories and exactly one system category');

select set_eq(
  $$ select name from public.categories where user_id = '11111111-1111-4111-8111-111111111111' $$,
  array['Everyday', 'Work', 'Law', 'Finance', 'Technology', 'Travel', 'Food', 'Health', 'Education', 'Other'],
  'new user is seeded with the default categories');

select is(
  (select name from public.categories where user_id = '11111111-1111-4111-8111-111111111111' and is_system),
  'Other',
  'the system category is Other');

-- ---------------------------------------------------------------- as user 1

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}';

select is((select count(*) from public.categories), 10::bigint, 'user 1 sees only own 10 categories');

insert into public.categories (id, name, slug)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'Temp', 'temp'),
       ('aaaaaaaa-0000-4000-8000-000000000002', 'Keep', 'keep');

insert into public.vocabulary_cards (id, title, category_id, created_at, updated_at) values
  ('cccccccc-0000-4000-8000-000000000001', 'card one', 'aaaaaaaa-0000-4000-8000-000000000001',
   '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');

select is((select user_id::text from public.vocabulary_cards where id = 'cccccccc-0000-4000-8000-000000000001'),
  '11111111-1111-4111-8111-111111111111', 'user_id defaults to auth.uid()');

-- last-write-wins
update public.vocabulary_cards set title = 'stale', updated_at = '2025-12-31T00:00:00Z'
 where id = 'cccccccc-0000-4000-8000-000000000001';
select is((select title from public.vocabulary_cards where id = 'cccccccc-0000-4000-8000-000000000001'),
  'card one', 'stale update (older updated_at) is skipped');

update public.vocabulary_cards
   set title = 'fresh', updated_at = '2026-01-02T00:00:00Z', server_updated_at = '2000-01-01T00:00:00Z'
 where id = 'cccccccc-0000-4000-8000-000000000001';
select is((select title from public.vocabulary_cards where id = 'cccccccc-0000-4000-8000-000000000001'),
  'fresh', 'newer update is applied');
select ok((select server_updated_at > '2020-01-01' from public.vocabulary_cards where id = 'cccccccc-0000-4000-8000-000000000001'),
  'server_updated_at is set by the server, not the client');

-- constraints
select throws_ok(
  $$ insert into public.vocabulary_cards (title, category_id, status) values ('x', 'aaaaaaaa-0000-4000-8000-000000000001', 'learned') $$,
  '23514', null, 'learned card requires learned_at');
select throws_ok(
  $$ insert into public.vocabulary_cards (title, category_id, audio_path) values ('x', 'aaaaaaaa-0000-4000-8000-000000000001', 'someone/else/a.m4a') $$,
  '23514', null, 'audio_path must start with <user_id>/<card_id>/');
select throws_ok(
  $$ insert into public.categories (name, slug) values ('temp', 'temp-2') $$,
  '23505', null, 'category names are unique case-insensitively');

-- missing category -> Other
insert into public.vocabulary_cards (id, title, category_id)
values ('cccccccc-0000-4000-8000-000000000002', 'card two', 'ffffffff-0000-4000-8000-00000000ffff');
select is(
  (select c.name from public.vocabulary_cards v join public.categories c on c.id = v.category_id
    where v.id = 'cccccccc-0000-4000-8000-000000000002'),
  'Other', 'card with an unknown category is assigned to Other');

-- soft-deleting a category moves its cards to Other, without touching updated_at
update public.categories set deleted_at = now(), updated_at = now() + interval '1 minute'
 where id = 'aaaaaaaa-0000-4000-8000-000000000001';
select is(
  (select c.name || ' ' || v.updated_at::date from public.vocabulary_cards v join public.categories c on c.id = v.category_id
    where v.id = 'cccccccc-0000-4000-8000-000000000001'),
  'Other 2026-01-02', 'deleting a category moves its cards to Other (updated_at untouched)');

insert into public.vocabulary_cards (id, title, category_id)
values ('cccccccc-0000-4000-8000-000000000003', 'card three', 'aaaaaaaa-0000-4000-8000-000000000001');
select is(
  (select c.name from public.vocabulary_cards v join public.categories c on c.id = v.category_id
    where v.id = 'cccccccc-0000-4000-8000-000000000003'),
  'Other', 'card pointing to a deleted category is assigned to Other');

-- Other is protected (AC-48)
select throws_ok($$ update public.categories set name = 'Misc' where is_system $$,
  '23514', null, 'Other cannot be renamed');
select throws_ok($$ update public.categories set deleted_at = now() where is_system $$,
  '23514', null, 'Other cannot be soft-deleted');
select throws_ok($$ update public.categories set is_system = true where slug = 'law' $$,
  '23514', null, 'a category cannot be promoted to system');
select throws_ok($$ insert into public.categories (name, slug, is_system) values ('Sys', 'sys', true) $$,
  '42501', null, 'clients cannot insert system categories');

-- no hard deletes
select throws_ok($$ delete from public.vocabulary_cards $$, '42501', null, 'cards cannot be hard-deleted');
select throws_ok($$ delete from public.categories $$, '42501', null, 'categories cannot be hard-deleted');

-- cannot write rows for another user
select throws_ok(
  $$ insert into public.vocabulary_cards (user_id, title, category_id)
     values ('22222222-2222-4222-8222-222222222222', 'x', 'aaaaaaaa-0000-4000-8000-000000000001') $$,
  '42501', null, 'cannot insert a card for another user');

-- storage: own folder only
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('audio', '11111111-1111-4111-8111-111111111111/cccccccc-0000-4000-8000-000000000001/r1.m4a') $$,
  'user can upload into own audio folder');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('audio', '22222222-2222-4222-8222-222222222222/x/r1.m4a') $$,
  '42501', null, 'user cannot upload into another user''s folder');

-- ---------------------------------------------------------------- as user 2 (AC-57)

set local role postgres;
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-4222-8222-222222222222", "role": "authenticated"}';

select is((select count(*) from public.categories where user_id <> '22222222-2222-4222-8222-222222222222'), 0::bigint,
  'user 2 cannot read other users'' categories');
select is((select count(*) from public.vocabulary_cards), 0::bigint, 'user 2 cannot read other users'' cards');

with u as (update public.vocabulary_cards set title = 'hacked', updated_at = '2030-01-01T00:00:00Z'
            where id = 'cccccccc-0000-4000-8000-000000000001' returning 1)
select is(count(*), 0::bigint, 'user 2 cannot update user 1''s card') from u;
with u as (update public.categories set name = 'Hacked', updated_at = '2030-01-01T00:00:00Z'
            where user_id = '11111111-1111-4111-8111-111111111111' and slug = 'law' returning 1)
select is(count(*), 0::bigint, 'user 2 cannot update user 1''s categories') from u;

-- referencing another user's category never links to it (resolved to own Other)
insert into public.vocabulary_cards (id, title, category_id)
values ('cccccccc-0000-4000-8000-000000000004', 'card four', 'aaaaaaaa-0000-4000-8000-000000000002');
select is(
  (select c.user_id::text || ' ' || c.name from public.vocabulary_cards v join public.categories c on c.id = v.category_id
    where v.id = 'cccccccc-0000-4000-8000-000000000004'),
  '22222222-2222-4222-8222-222222222222 Other', 'another user''s category id is replaced by own Other');

-- storage (AC-57)
select is((select count(*) from storage.objects where bucket_id = 'audio'), 0::bigint,
  'user 2 cannot list other users'' audio');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('audio', '11111111-1111-4111-8111-111111111111/x/r2.m4a') $$,
  '42501', null, 'user 2 cannot upload into user 1''s folder');

-- ---------------------------------------------------------------- anon (AC-55)

set local role postgres;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok($$ select count(*) from public.vocabulary_cards $$, '42501', null, 'anon cannot read cards');
select throws_ok($$ select count(*) from public.categories $$, '42501', null, 'anon cannot read categories');
select is((select count(*) from storage.objects where bucket_id = 'audio'), 0::bigint, 'anon cannot list audio');

set local role postgres;
select * from finish();
rollback;
