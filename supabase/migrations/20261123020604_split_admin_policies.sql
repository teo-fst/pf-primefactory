-- Le policy "for all" degli admin si sovrapponevano alle policy di lettura su SELECT.
-- Le separo per azione: la lettura resta coperta dalla policy pubblica (che include già is_admin()).
do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('business_lines', 'business_lines_admin_write'),
      ('pages', 'pages_admin_write'),
      ('site_texts', 'site_texts_admin_write'),
      ('site_settings', 'site_settings_admin_write'),
      ('portfolio_items', 'portfolio_admin_write'),
      ('events', 'events_admin_write'),
      ('legal_documents', 'legal_admin_write'),
      ('request_statuses', 'request_statuses_admin_write')
    ) as v(tbl, pol)
  loop
    execute format('drop policy %I on public.%I', t.pol, t.tbl);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select private.is_admin()))', t.tbl || '_admin_insert', t.tbl);
    execute format('create policy %I on public.%I for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))', t.tbl || '_admin_update', t.tbl);
    execute format('create policy %I on public.%I for delete to authenticated using ((select private.is_admin()))', t.tbl || '_admin_delete', t.tbl);
  end loop;
end;
$$;
