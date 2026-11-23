-- Collaudo delle regole di accesso (RLS).
-- Crea utenti e dati di prova, verifica cosa vedono anon, cliente e admin,
-- poi solleva un'eccezione con i risultati: la transazione viene annullata e nel DB non resta nulla.
-- Esecuzione: SQL Editor di Supabase o MCP execute_sql. Esito atteso: tutti i Tn=true.
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); adm uuid := gen_random_uuid();
  ra uuid; rb uuid; n int; nota text; res text := '';
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test-a@example.invalid', '{"full_name":"A"}', now(), now()),
         (b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test-b@example.invalid', '{"full_name":"B"}', now(), now()),
         (adm, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test-adm@example.invalid', '{}', now(), now());
  update public.profiles set role = 'admin' where id = adm;
  insert into public.requests (customer_id, business_line_id, description, privacy_consent_at)
    values (a, (select id from public.business_lines where slug='moto-bici'), 'Supporto targa R6 test', now()) returning id into ra;
  insert into public.requests (customer_id, business_line_id, description, privacy_consent_at)
    values (b, (select id from public.business_lines where slug='gioielleria'), 'Anello argento test', now()) returning id into rb;
  insert into public.request_messages (request_id, author_id, body, internal) values (ra, adm, 'pubblico', false), (ra, adm, 'nota interna', true);

  -- T0: lo storico degli stati si crea da solo all'inserimento
  select count(*) into n from public.request_status_history where request_id in (ra, rb);
  res := res || 'T0=' || (n=2) || '; ';

  -- Visitatore anonimo
  execute 'set local role anon';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  select count(*) into n from public.business_lines; res := res || 'T1 anon vede 4 linee attive=' || (n=4) || '; ';
  select count(*) into n from public.requests; res := res || 'T2 anon nessuna richiesta=' || (n=0) || '; ';
  select count(*) into n from public.site_settings; res := res || 'T3 anon impostazioni pubbliche=' || (n=2) || '; ';
  execute 'reset role';

  -- Cliente A
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  select count(*) into n from public.requests; res := res || 'T4 A vede solo la sua=' || (n=1) || '; ';
  select count(*) into n from public.requests where id = rb; res := res || 'T5 A non vede B=' || (n=0) || '; ';
  select count(*) into n from public.request_messages; res := res || 'T6 A non vede note interne=' || (n=1) || '; ';
  select count(*) into n from public.profiles; res := res || 'T7 A vede solo il suo profilo=' || (n=1) || '; ';
  begin update public.profiles set role = 'admin' where id = a; res := res || 'T8 A non cambia ruolo=false; ';
  exception when insufficient_privilege then res := res || 'T8 A non cambia ruolo=true; '; end;
  update public.profiles set full_name = 'A2' where id = a; get diagnostics n = row_count; res := res || 'T9 A cambia nome=' || (n=1) || '; ';
  begin insert into public.requests (customer_id, business_line_id, description, privacy_consent_at) values (a, 1, 'insert diretto test', now()); res := res || 'T10 A non inserisce richieste=false; ';
  exception when insufficient_privilege then res := res || 'T10 A non inserisce richieste=true; '; end;
  begin insert into public.request_messages (request_id, author_id, body) values (rb, a, 'intrusione'); res := res || 'T11 A non scrive su B=false; ';
  exception when insufficient_privilege then res := res || 'T11 A non scrive su B=true; '; end;
  begin insert into public.request_messages (request_id, author_id, body, internal) values (ra, a, 'finta interna', true); res := res || 'T12 A non scrive note interne=false; ';
  exception when insufficient_privilege then res := res || 'T12 A non scrive note interne=true; '; end;
  insert into public.request_messages (request_id, author_id, body) values (ra, a, 'ciao'); res := res || 'T13 A scrive sulla sua=true; ';
  update public.requests set status = 'chiuso' where id = ra; get diagnostics n = row_count; res := res || 'T14 A non cambia stato=' || (n=0) || '; ';
  select count(*) into n from public.business_lines; res := res || 'T15 A vede 4 linee=' || (n=4) || '; ';
  begin insert into public.site_texts (key, locale, value) values ('test.x', 'it', 'x'); res := res || 'T20 A non scrive testi=false; ';
  exception when insufficient_privilege then res := res || 'T20 A non scrive testi=true; '; end;
  update public.pages set visibility = 'oscurata' where slug = 'home'; get diagnostics n = row_count; res := res || 'T21 A non cambia pagine=' || (n=0) || '; ';
  -- T24: un cliente autenticato non può chiamare get_user_id_by_email (ricerca utenti per email, solo service_role)
  begin perform public.get_user_id_by_email('test-a@example.invalid'); res := res || 'T24 A non chiama get_user_id_by_email=false; ';
  exception when insufficient_privilege then res := res || 'T24 A non chiama get_user_id_by_email=true; '; end;
  execute 'reset role';

  -- Visitatore anonimo: nemmeno lui può cercare utenti per email
  execute 'set local role anon';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin perform public.get_user_id_by_email('test-a@example.invalid'); res := res || 'T25 anon non chiama get_user_id_by_email=false; ';
  exception when insufficient_privilege then res := res || 'T25 anon non chiama get_user_id_by_email=true; '; end;
  execute 'reset role';

  -- Admin
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  select count(*) into n from public.requests; res := res || 'T16 admin vede tutte=' || (n=2) || '; ';
  select count(*) into n from public.business_lines; res := res || 'T17 admin vede anche oscurate=' || (n=5) || '; ';
  update public.requests set status = 'in_valutazione' where id = ra; get diagnostics n = row_count; res := res || 'T18 admin cambia stato=' || (n=1) || '; ';
  insert into public.site_texts (key, locale, value) values ('test.x', 'it', 'x'); res := res || 'T22 admin scrive testi=true; ';
  update public.pages set visibility = 'in_sviluppo' where slug = 'eventi'; get diagnostics n = row_count; res := res || 'T23 admin cambia pagine=' || (n=1) || '; ';
  execute 'reset role';
  select count(*) into n from public.request_status_history where request_id = ra; res := res || 'T19 storico cambio stato=' || (n=2) || '; ';

  -- F1.9: cambio stato con nota, portfolio, eventi, notifiche, Storage

  -- Admin: cambio stato con nota (funzione change_request_status, security invoker)
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform public.change_request_status(rb, 'preventivo_inviato', 'nota di prova');
  begin perform public.change_request_status(rb, 'preventivo_inviato', null); res := res || 'T29 stesso stato rifiutato=false; ';
  exception when raise_exception then res := res || 'T29 stesso stato rifiutato=true; '; end;
  begin perform public.change_request_status(rb, 'stato_che_non_esiste', null); res := res || 'T30 stato inesistente rifiutato=false; ';
  exception when foreign_key_violation then res := res || 'T30 stato inesistente rifiutato=true; '; end;
  -- Portfolio: il vincolo "diritti ceduti" blocca la pubblicazione; con i diritti si pubblica
  begin insert into public.portfolio_items (image_path, rights_transferred, published) values ('test/senza-diritti.png', false, true);
    res := res || 'T32 admin non pubblica senza diritti=false; ';
  exception when check_violation then res := res || 'T32 admin non pubblica senza diritti=true; '; end;
  insert into public.portfolio_items (image_path, rights_transferred, published) values ('test/con-diritti.png', true, true);
  res := res || 'T33 admin pubblica con diritti=true; ';
  insert into public.events (title_it, title_en, starts_on, source_code) values ('Evento test', 'Test event', current_date, 'evento-test-rls');
  res := res || 'T34 admin crea eventi=true; ';
  -- Storage: l'admin carica nel bucket portfolio
  insert into storage.objects (bucket_id, name) values ('portfolio', 'test/admin.png');
  res := res || 'T38 admin carica nel bucket portfolio=true; ';
  execute 'reset role';
  select h.note into nota from public.request_status_history h where h.request_id = rb order by h.id desc limit 1;
  res := res || 'T28 la nota finisce nello storico=' || coalesce(nota = 'nota di prova', false) || '; ';
  select count(*) into n from public.request_status_history where request_id = rb;
  res := res || 'T31 un solo evento di storico per il cambio=' || (n = 2) || '; ';

  -- Notifiche: ognuno vede e segna come lette solo le proprie
  insert into public.notifications (user_id, kind) values (adm, 'test'), (a, 'test'), (a, 'test');

  -- Cliente A: non cambia stato con la funzione, non scrive su portfolio/eventi/Storage, gestisce le sue notifiche
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  begin perform public.change_request_status(ra, 'chiuso', 'intrusione'); res := res || 'T35 A non usa change_request_status=false; ';
  exception when insufficient_privilege then res := res || 'T35 A non usa change_request_status=true; '; end;
  begin insert into public.portfolio_items (image_path) values ('test/a.png'); res := res || 'T36 A non scrive nel portfolio=false; ';
  exception when insufficient_privilege then res := res || 'T36 A non scrive nel portfolio=true; '; end;
  begin insert into public.events (title_it, title_en, starts_on, source_code) values ('x', 'x', current_date, 'a-non-puo'); res := res || 'T37 A non crea eventi=false; ';
  exception when insufficient_privilege then res := res || 'T37 A non crea eventi=true; '; end;
  begin insert into storage.objects (bucket_id, name) values ('portfolio', 'test/a.png'); res := res || 'T39 A non carica nel bucket portfolio=false; ';
  exception when insufficient_privilege then res := res || 'T39 A non carica nel bucket portfolio=true; '; end;
  select count(*) into n from public.notifications where user_id <> a; res := res || 'T40 A non vede le notifiche altrui=' || (n = 0) || '; ';
  update public.notifications set read_at = now() where id > 0; get diagnostics n = row_count; res := res || 'T41 A segna come lette le sue=' || (n >= 2) || '; ';
  begin update public.notifications set kind = 'manomesso' where id > 0; res := res || 'T42 A non altera altre colonne=false; ';
  exception when insufficient_privilege then res := res || 'T42 A non altera altre colonne=true; '; end;
  execute 'reset role';

  -- Anonimo: niente funzione di cambio stato, niente upload nel portfolio
  execute 'set local role anon';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin perform public.change_request_status(ra, 'chiuso', null); res := res || 'T43 anon non usa change_request_status=false; ';
  exception when insufficient_privilege then res := res || 'T43 anon non usa change_request_status=true; '; end;
  begin insert into storage.objects (bucket_id, name) values ('portfolio', 'test/anon.png'); res := res || 'T44 anon non carica nel bucket portfolio=false; ';
  exception when insufficient_privilege then res := res || 'T44 anon non carica nel bucket portfolio=true; '; end;
  execute 'reset role';

  -- Admin: vede solo le proprie notifiche
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  select count(*) into n from public.notifications where user_id <> adm; res := res || 'T45 admin non vede le notifiche altrui=' || (n = 0) || '; ';
  execute 'reset role';

  -- Solo service_role (chiave segreta del server) può usare get_user_id_by_email
  execute 'set local role service_role';
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  res := res || 'T26 service_role trova l''utente=' || (public.get_user_id_by_email('TEST-A@example.invalid') = a) || '; ';
  res := res || 'T27 email inesistente = null=' || (public.get_user_id_by_email('nessuno@example.invalid') is null) || '; ';
  execute 'reset role';

  -- Ultimo admin: il ruolo non si toglie (trigger profiles_protect_last_admin), nemmeno senza RLS
  update public.profiles set role = 'cliente' where role = 'admin' and id <> adm;
  begin update public.profiles set role = 'cliente' where id = adm; res := res || 'T46 ultimo admin protetto=false; ';
  exception when check_violation then res := res || 'T46 ultimo admin protetto=true; '; end;
  update public.profiles set role = 'admin' where id = a;
  update public.profiles set role = 'cliente' where id = adm; get diagnostics n = row_count;
  res := res || 'T47 con due admin se ne puo togliere uno=' || (n = 1);

  raise exception 'RISULTATI: %', res;
end;
$$;
