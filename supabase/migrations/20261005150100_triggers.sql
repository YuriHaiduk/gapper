-- Server-side invariants: server_updated_at, last-write-wins, category integrity (SPEC §17 "002").

-- server_updated_at maintained by the server only
create or replace function public.touch_server_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.server_updated_at := clock_timestamp();
  return new;
end $$;

-- last-write-wins: skip stale updates
create or replace function public.skip_stale_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.updated_at < old.updated_at then
    return null;
  end if;
  return new;
end $$;

-- cards: missing or deleted category -> user's Other
create or replace function public.cards_resolve_category()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.category_id is null or not exists (
    select 1 from public.categories c
    where c.id = new.category_id and c.user_id = new.user_id and c.deleted_at is null
  ) then
    select c.id into new.category_id
    from public.categories c
    where c.user_id = new.user_id and c.is_system;
  end if;
  return new;
end $$;

-- categories: protect Other, forbid promoting to system
create or replace function public.categories_protect_system()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.is_system and (
       new.name is distinct from old.name or new.slug is distinct from old.slug
       or new.deleted_at is not null or not new.is_system) then
    raise exception 'The "Other" category cannot be renamed or deleted' using errcode = 'check_violation';
  end if;
  if not old.is_system and new.is_system then
    raise exception 'Cannot promote a category to system' using errcode = 'check_violation';
  end if;
  return new;
end $$;

-- categories: on soft delete move cards to Other (updated_at intentionally untouched)
create or replace function public.categories_reassign_cards()
returns trigger language plpgsql set search_path = '' as $$
declare v_other uuid;
begin
  if old.deleted_at is null and new.deleted_at is not null then
    select c.id into v_other from public.categories c where c.user_id = new.user_id and c.is_system;
    update public.vocabulary_cards
       set category_id = v_other
     where category_id = new.id and user_id = new.user_id;
  end if;
  return null;
end $$;

-- Triggers fire in alphabetical order per timing: a_ (LWW) before b_ before z_.
drop trigger if exists a_skip_stale   on public.categories;
drop trigger if exists b_protect      on public.categories;
drop trigger if exists z_touch        on public.categories;
drop trigger if exists reassign_cards on public.categories;
create trigger a_skip_stale   before update           on public.categories for each row execute function public.skip_stale_update();
create trigger b_protect      before update           on public.categories for each row execute function public.categories_protect_system();
create trigger z_touch        before insert or update on public.categories for each row execute function public.touch_server_updated_at();
create trigger reassign_cards after update            on public.categories for each row execute function public.categories_reassign_cards();

drop trigger if exists a_skip_stale on public.vocabulary_cards;
drop trigger if exists b_category   on public.vocabulary_cards;
drop trigger if exists z_touch      on public.vocabulary_cards;
create trigger a_skip_stale before update           on public.vocabulary_cards for each row execute function public.skip_stale_update();
create trigger b_category   before insert or update on public.vocabulary_cards for each row execute function public.cards_resolve_category();
create trigger z_touch      before insert or update on public.vocabulary_cards for each row execute function public.touch_server_updated_at();
