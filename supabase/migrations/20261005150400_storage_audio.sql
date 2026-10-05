-- Private audio bucket; objects live under "<user_id>/" (SPEC §19).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audio', 'audio', false, 5242880,
        array['audio/mp4', 'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/wav'])
on conflict (id) do nothing;

drop policy if exists audio_select on storage.objects;
drop policy if exists audio_insert on storage.objects;
drop policy if exists audio_update on storage.objects;
drop policy if exists audio_delete on storage.objects;

create policy audio_select on storage.objects for select to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy audio_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy audio_update on storage.objects for update to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy audio_delete on storage.objects for delete to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text);
