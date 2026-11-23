-- F1.9: l'admin deve poter VEDERE gli oggetti del bucket `portfolio` (policy SELECT su storage.objects).
-- Senza, l'API di Storage non trova l'oggetto e la cancellazione dal pannello restituisce "ok" senza eliminare
-- nulla (il DELETE ... RETURNING dell'API richiede anche la visibilità della riga). Il bucket resta pubblico:
-- le foto si leggono dall'indirizzo pubblico senza policy; questa riguarda solo l'elenco/gestione da parte degli admin.
create policy portfolio_obj_admin_select on storage.objects for select to authenticated
  using (bucket_id = 'portfolio' and (select private.is_admin()));
