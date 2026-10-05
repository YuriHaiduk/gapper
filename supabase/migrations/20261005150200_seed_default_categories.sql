-- One-time seeding of default categories per user (SPEC §8.3, §17 "003").

create or replace function public.seed_default_categories(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.categories (user_id, name, slug, is_system) values
    (p_user_id, 'Other',      'other',      true),
    (p_user_id, 'Everyday',   'everyday',   false),
    (p_user_id, 'Work',       'work',       false),
    (p_user_id, 'Law',        'law',        false),
    (p_user_id, 'Finance',    'finance',    false),
    (p_user_id, 'Technology', 'technology', false),
    (p_user_id, 'Travel',     'travel',     false),
    (p_user_id, 'Food',       'food',       false),
    (p_user_id, 'Health',     'health',     false),
    (p_user_id, 'Education',  'education',  false)
  on conflict do nothing;
end $$;

revoke execute on function public.seed_default_categories(uuid) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.seed_default_categories(new.id);
  return new;
end $$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- backfill users created before this migration
select public.seed_default_categories(u.id)
from auth.users u
where not exists (select 1 from public.categories c where c.user_id = u.id);
