-- The dashboard option "Enable automatic RLS" creates public.rls_auto_enable(), a SECURITY DEFINER
-- event-trigger function that is exposed via /rest/v1/rpc. Event triggers do not need EXECUTE at fire
-- time, so API roles lose it. Conditional: the function does not exist on local stacks.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
