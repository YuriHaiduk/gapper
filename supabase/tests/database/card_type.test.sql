-- Card part of speech column (SPEC §17, D63). Rolled back: safe against the linked cloud project.
--   npx supabase@2.119.0 test db --linked

begin;
set local role postgres;
set local search_path = public, extensions;
select no_plan();

select has_column('public', 'vocabulary_cards', 'type', 'cards have a type column');
select col_type_is('public', 'vocabulary_cards', 'type', 'text', 'type is text');
select col_is_null('public', 'vocabulary_cards', 'type', 'type is optional');

insert into auth.users (id, email, aud, role) values
  ('44444444-4444-4444-8444-444444444444', 'type-test@example.invalid', 'authenticated', 'authenticated');

select lives_ok(
  $$ insert into public.vocabulary_cards (user_id, title, category_id, type)
     select '44444444-4444-4444-8444-444444444444', 'x', id, 'phrasal_verb'
     from public.categories where user_id = '44444444-4444-4444-8444-444444444444' and is_system $$,
  'a known key is accepted');
select lives_ok(
  $$ insert into public.vocabulary_cards (user_id, title, category_id, type)
     select '44444444-4444-4444-8444-444444444444', 'x', id, null
     from public.categories where user_id = '44444444-4444-4444-8444-444444444444' and is_system $$,
  'null type is accepted');
select throws_ok(
  $$ insert into public.vocabulary_cards (user_id, title, category_id, type)
     select '44444444-4444-4444-8444-444444444444', 'x', id, 'Noun'
     from public.categories where user_id = '44444444-4444-4444-8444-444444444444' and is_system $$,
  '23514', null, 'a label instead of a key is rejected');
select throws_ok(
  $$ insert into public.vocabulary_cards (user_id, title, category_id, type)
     select '44444444-4444-4444-8444-444444444444', 'x', id, 'conjunction'
     from public.categories where user_id = '44444444-4444-4444-8444-444444444444' and is_system $$,
  '23514', null, 'an unknown key is rejected');

select * from finish();
rollback;
