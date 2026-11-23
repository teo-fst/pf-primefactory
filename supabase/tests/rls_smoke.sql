-- Collaudo delle regole di accesso (RLS).
-- Crea utenti e dati di prova, verifica cosa vedono anon, cliente e admin,
-- poi solleva un'eccezione con i risultati: la transazione viene annullata e nel DB non resta nulla.
-- Esecuzione: SQL Editor di Supabase o MCP execute_sql. Esito atteso: tutti i Tn=true.
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); adm uuid := gen_random_uuid();
  ra uuid; rb uuid; n int; nota text; tot int; res text := '';
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
  -- Totale delle richieste nel DB (di prova + eventuali altre): T16 lo confronta con ciò che vede l'admin.
  select count(*) into tot from public.requests;

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
  select count(*) into n from public.requests; res := res || 'T16 admin vede tutte, anche con altre richieste nel DB=' || (n=tot) || '; ';
  select count(*) into n from public.business_lines; res := res || 'T17 admin vede anche oscurate=' || (n=5) || '; ';
  update public.requests set status = 'in_valutazione' where id = ra; get diagnostics n = row_count; res := res || 'T18 admin cambia stato=' || (n=1) || '; ';
  insert into public.site_texts (key, locale, value) values ('test.x', 'it', 'x'); res := res || 'T22 admin scrive testi=true; ';
  update public.pages set visibility = 'in_sviluppo' where slug = 'eventi'; get diagnostics n = row_count; res := res || 'T23 admin cambia pagine=' || (n=1) || '; ';
  execute 'reset role';
  select count(*) into n from public.request_status_history where request_id = ra; res := res || 'T19 storico cambio stato=' || (n=2) || '; ';

  -- Solo service_role (chiave segreta del server) può usare get_user_id_by_email
  execute 'set local role service_role';
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  res := res || 'T26 service_role trova l''utente=' || (public.get_user_id_by_email('TEST-A@example.invalid') = a) || '; ';
  res := res || 'T27 email inesistente = null=' || (public.get_user_id_by_email('nessuno@example.invalid') is null) || '; ';
  execute 'reset role';

  -- Notifiche (F1.10): l'outbox è solo del service_role e i trigger generano gli eventi giusti.
  -- Tutte le etichette sono N<numero>; stato corrente dei dati di prova: ra (cliente A) è in_valutazione,
  -- rb (cliente B) è richiesta; adm è l'unico admin.
  declare
    ob bigint;
    m boolean;
  begin
    res := res || '; ';

    -- Eventi generati dai dati di prova (si legge come postgres: l'outbox non è leggibile dai ruoli API)
    select count(*) into n from public.notification_outbox where request_id in (ra, rb) and event_type = 'request_created';
    res := res || 'N1 ogni richiesta nuova genera un evento=' || (n=2) || '; ';
    select count(*) into n from public.notification_outbox where request_id = ra and event_type = 'message_from_admin';
    res := res || 'N2 messaggio admin non interno -> 1 evento (la nota interna nessuno)=' || (n=1) || '; ';
    select count(*) into n from public.notification_outbox where request_id = ra and event_type = 'message_from_customer';
    res := res || 'N3 messaggio del cliente -> 1 evento=' || (n=1) || '; ';
    select count(*) into n from public.notification_outbox where request_id = ra and event_type = 'status_changed';
    res := res || 'N4 cambio stato con notify_client -> 1 evento=' || (n=1) || '; ';
    -- controllo_qualita ha notify_client=false: nessun evento; pronto ha notify_client=true: un evento
    update public.requests set status = 'controllo_qualita' where id = rb;
    select count(*) into n from public.notification_outbox where request_id = rb and event_type = 'status_changed';
    res := res || 'N5 stato senza notify_client -> nessun evento=' || (n=0) || '; ';
    update public.requests set status = 'pronto' where id = rb;
    select count(*) into n from public.notification_outbox where request_id = rb and event_type = 'status_changed';
    res := res || 'N6 stato con notify_client -> 1 evento=' || (n=1) || '; ';
    -- file: due caricamenti del cliente di fila = un solo evento con file_count 2; un file dell'admin nessun evento
    insert into public.request_files (request_id, storage_path, original_name, size_bytes, uploaded_by)
      values (ra, ra::text || '/n-test-1.stl', 'n-test-1.stl', 10, a), (ra, ra::text || '/n-test-2.stl', 'n-test-2.stl', 10, a);
    insert into public.request_files (request_id, storage_path, original_name, size_bytes, uploaded_by)
      values (ra, ra::text || '/n-test-3.stl', 'n-test-3.stl', 10, adm);
    select count(*) into n from public.notification_outbox where request_id = ra and event_type = 'file_uploaded' and (payload ->> 'file_count')::int = 2;
    res := res || 'N7 file del cliente raggruppati in 1 evento (file dell''admin ignorato)=' || (n=1) || '; ';
    -- dati minimi: nel payload niente testi, email o nomi di file
    select count(*) into n from public.notification_outbox
      where request_id in (ra, rb) and payload::text ~* '(targa|argento|ciao|pubblico|nota interna|@|n-test|\.stl)';
    res := res || 'N8 payload senza dati personali=' || (n=0) || '; ';
    -- notifiche in-app: una per ogni admin e per evento verso i soci; mai al cliente
    select count(*) into n from public.notifications where user_id = adm;
    res := res || 'N9 notifiche in-app all''admin (2 richieste, 1 messaggio, 1 file)=' || (n=4) || '; ';
    select count(*) into n from public.notifications where user_id in (a, b);
    res := res || 'N10 nessuna notifica in-app ai clienti=' || (n=0) || '; ';

    -- RLS attiva e nessuna policy
    select relrowsecurity into strict m from pg_class where oid = 'public.notification_outbox'::regclass;
    res := res || 'N11 RLS attiva su notification_outbox=' || m || '; ';
    select count(*) into n from pg_policies where schemaname = 'public' and tablename = 'notification_outbox';
    res := res || 'N12 nessuna policy su notification_outbox=' || (n=0) || '; ';

    -- anon: niente lettura, scrittura né funzioni del processore
    execute 'set local role anon';
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    begin perform count(*) from public.notification_outbox; res := res || 'N13 anon non legge l''outbox=false; ';
    exception when insufficient_privilege then res := res || 'N13 anon non legge l''outbox=true; '; end;
    begin insert into public.notification_outbox (event_type, payload) values ('request_created', '{}'); res := res || 'N14 anon non scrive nell''outbox=false; ';
    exception when insufficient_privilege then res := res || 'N14 anon non scrive nell''outbox=true; '; end;
    begin perform public.notify_claim_batch(5); res := res || 'N15 anon non chiama notify_claim_batch=false; ';
    exception when insufficient_privilege then res := res || 'N15 anon non chiama notify_claim_batch=true; '; end;
    begin perform public.notify_mark_done(1, '{}'); res := res || 'N16 anon non chiama notify_mark_done=false; ';
    exception when insufficient_privilege then res := res || 'N16 anon non chiama notify_mark_done=true; '; end;
    begin perform public.notify_mark_failed(1, 'x', now(), '{}'); res := res || 'N17 anon non chiama notify_mark_failed=false; ';
    exception when insufficient_privilege then res := res || 'N17 anon non chiama notify_mark_failed=true; '; end;
    execute 'reset role';

    -- authenticated (cliente A e anche l'admin): stessa cosa. Le funzioni trigger non sono chiamabili da nessuno.
    execute 'set local role authenticated';
    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    begin perform count(*) from public.notification_outbox; res := res || 'N18 cliente non legge l''outbox=false; ';
    exception when insufficient_privilege then res := res || 'N18 cliente non legge l''outbox=true; '; end;
    begin insert into public.notification_outbox (event_type, payload) values ('request_created', '{}'); res := res || 'N19 cliente non scrive nell''outbox=false; ';
    exception when insufficient_privilege then res := res || 'N19 cliente non scrive nell''outbox=true; '; end;
    begin update public.notification_outbox set processed_at = now(); res := res || 'N20 cliente non aggiorna l''outbox=false; ';
    exception when insufficient_privilege then res := res || 'N20 cliente non aggiorna l''outbox=true; '; end;
    begin delete from public.notification_outbox; res := res || 'N21 cliente non cancella dall''outbox=false; ';
    exception when insufficient_privilege then res := res || 'N21 cliente non cancella dall''outbox=true; '; end;
    begin perform public.notify_claim_batch(5); res := res || 'N22 cliente non chiama notify_claim_batch=false; ';
    exception when insufficient_privilege then res := res || 'N22 cliente non chiama notify_claim_batch=true; '; end;
    begin perform public.notify_mark_done(1, '{}'); res := res || 'N23 cliente non chiama notify_mark_done=false; ';
    exception when insufficient_privilege then res := res || 'N23 cliente non chiama notify_mark_done=true; '; end;
    begin perform public.notify_mark_failed(1, 'x', now(), '{}'); res := res || 'N24 cliente non chiama notify_mark_failed=false; ';
    exception when insufficient_privilege then res := res || 'N24 cliente non chiama notify_mark_failed=true; '; end;
    begin perform private.notify_request_created(); res := res || 'N25 cliente non chiama le funzioni trigger=false; ';
    exception when insufficient_privilege then res := res || 'N25 cliente non chiama le funzioni trigger=true; '; end;
    perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
    begin perform count(*) from public.notification_outbox; res := res || 'N26 nemmeno l''admin legge l''outbox dal client=false; ';
    exception when insufficient_privilege then res := res || 'N26 nemmeno l''admin legge l''outbox dal client=true; '; end;
    execute 'reset role';

    -- service_role: prende il lotto (con lease), non lo riprende subito, registra esito e fallimento
    execute 'set local role service_role';
    perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
    select count(*) into n from public.notify_claim_batch(50) c where c.request_id in (ra, rb) and c.attempts = 1;
    res := res || 'N27 service_role prende i 7 eventi di prova (attempts=1)=' || (n=7) || '; ';
    select count(*) into n from public.notify_claim_batch(50) c where c.request_id in (ra, rb);
    res := res || 'N28 il lease impedisce di riprenderli subito=' || (n=0) || '; ';
    select o.id into ob from public.notification_outbox o where o.request_id = ra and o.event_type = 'request_created';
    perform public.notify_mark_done(ob, array['customer_email', 'telegram']);
    select count(*) into n from public.notification_outbox where id = ob and processed_at is not null and delivered = array['customer_email', 'telegram'] and last_error is null;
    res := res || 'N29 notify_mark_done segna processed_at e le consegne=' || (n=1) || '; ';
    select o.id into ob from public.notification_outbox o where o.request_id = rb and o.event_type = 'request_created';
    perform public.notify_mark_failed(ob, 'resend_503', now() + interval '2 minutes', array['customer_email']);
    select count(*) into n from public.notification_outbox where id = ob and processed_at is null and last_error = 'resend_503' and delivered = array['customer_email'] and next_attempt_at > now();
    res := res || 'N30 notify_mark_failed registra errore, consegne e nuova attesa=' || (n=1) || '; ';
    execute 'reset role';
  end;

  -- Area clienti (F1.8): registrazione dei file. Sta in fondo, dopo i test N, per non alterarne i conteggi
  -- (ogni file del cliente genera eventi e notifiche). T28-T31 proseguono la numerazione dei test T.
  res := res || '; ';
  insert into public.request_files (request_id, storage_path, original_name, size_bytes, uploaded_by)
    values (rb, rb::text || '/00000000-0000-4000-8000-000000000000-d.stl', 'd.stl', 10, b);
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  insert into public.request_files (request_id, storage_path, original_name, size_bytes, uploaded_by)
    values (ra, ra::text || '/00000000-0000-4000-8000-000000000000-a.stl', 'a.stl', 10, a);
  res := res || 'T28 A registra un file sulla sua richiesta=true; ';
  begin insert into public.request_files (request_id, storage_path, original_name, size_bytes, uploaded_by)
    values (ra, rb::text || '/00000000-0000-4000-8000-000000000000-b.stl', 'b.stl', 10, a);
    res := res || 'T29 A non registra il percorso di un altro=false; ';
  exception when check_violation then res := res || 'T29 A non registra il percorso di un altro=true; '; end;
  begin insert into public.request_files (request_id, storage_path, original_name, size_bytes, uploaded_by)
    values (rb, rb::text || '/00000000-0000-4000-8000-000000000000-c.stl', 'c.stl', 10, a);
    res := res || 'T30 A non registra file sulla richiesta di B=false; ';
  exception when insufficient_privilege then res := res || 'T30 A non registra file sulla richiesta di B=true; '; end;
  select count(*) into n from public.request_files where request_id = rb; res := res || 'T31 A non vede file di B=' || (n=0) || '; ';
  begin insert into public.request_files (request_id, storage_path, original_name, size_bytes, uploaded_by, synced_at)
    values (ra, ra::text || '/00000000-0000-4000-8000-000000000000-e.stl', 'e.stl', 10, a, now());
    res := res || 'T32 A non imposta synced_at=false; ';
  exception when insufficient_privilege then res := res || 'T32 A non imposta synced_at=true; '; end;
  execute 'reset role';
  select count(*) into n from storage.buckets where id = 'request-files' and file_size_limit <= 52428800;
  res := res || 'T33 limite bucket entro i 50 MB del piano gratuito=' || (n=1) || '; ';

  -- F1.9: cambio stato con nota, portfolio, eventi, notifiche, Storage

  -- Admin: cambio stato con nota (funzione change_request_status, security invoker)
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform public.change_request_status(rb, 'preventivo_inviato', 'nota di prova');
  begin perform public.change_request_status(rb, 'preventivo_inviato', null); res := res || 'T35 stesso stato rifiutato=false; ';
  exception when raise_exception then res := res || 'T35 stesso stato rifiutato=true; '; end;
  begin perform public.change_request_status(rb, 'stato_che_non_esiste', null); res := res || 'T36 stato inesistente rifiutato=false; ';
  exception when foreign_key_violation then res := res || 'T36 stato inesistente rifiutato=true; '; end;
  -- Portfolio: il vincolo "diritti ceduti" blocca la pubblicazione; con i diritti si pubblica
  begin insert into public.portfolio_items (image_path, rights_transferred, published) values ('test/senza-diritti.png', false, true);
    res := res || 'T38 admin non pubblica senza diritti=false; ';
  exception when check_violation then res := res || 'T38 admin non pubblica senza diritti=true; '; end;
  insert into public.portfolio_items (image_path, rights_transferred, published) values ('test/con-diritti.png', true, true);
  res := res || 'T39 admin pubblica con diritti=true; ';
  insert into public.events (title_it, title_en, starts_on, source_code) values ('Evento test', 'Test event', current_date, 'evento-test-rls');
  res := res || 'T40 admin crea eventi=true; ';
  -- Storage: l'admin carica nel bucket portfolio
  insert into storage.objects (bucket_id, name) values ('portfolio', 'test/admin.png');
  res := res || 'T44 admin carica nel bucket portfolio=true; ';
  -- Storage: l'admin vede gli oggetti del portfolio (serve all'API per cancellarli dal pannello)
  select count(*) into n from storage.objects where bucket_id = 'portfolio' and name = 'test/admin.png';
  res := res || 'T54 admin vede gli oggetti del portfolio=' || (n = 1) || '; ';
  execute 'reset role';
  select h.note into nota from public.request_status_history h where h.request_id = rb order by h.id desc limit 1;
  res := res || 'T34 la nota finisce nello storico=' || coalesce(nota = 'nota di prova', false) || '; ';
  select count(*) into n from public.request_status_history where request_id = rb and note = 'nota di prova';
  res := res || 'T37 una sola riga di storico porta la nota=' || (n = 1) || '; ';

  -- Notifiche: ognuno vede e segna come lette solo le proprie
  insert into public.notifications (user_id, kind) values (adm, 'test'), (a, 'test'), (a, 'test');

  -- Cliente A: non cambia stato con la funzione, non scrive su portfolio/eventi/Storage, gestisce le sue notifiche
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  begin perform public.change_request_status(ra, 'chiuso', 'intrusione'); res := res || 'T41 A non usa change_request_status=false; ';
  exception when insufficient_privilege then res := res || 'T41 A non usa change_request_status=true; '; end;
  begin insert into public.portfolio_items (image_path) values ('test/a.png'); res := res || 'T42 A non scrive nel portfolio=false; ';
  exception when insufficient_privilege then res := res || 'T42 A non scrive nel portfolio=true; '; end;
  begin insert into public.events (title_it, title_en, starts_on, source_code) values ('x', 'x', current_date, 'a-non-puo'); res := res || 'T43 A non crea eventi=false; ';
  exception when insufficient_privilege then res := res || 'T43 A non crea eventi=true; '; end;
  begin insert into storage.objects (bucket_id, name) values ('portfolio', 'test/a.png'); res := res || 'T45 A non carica nel bucket portfolio=false; ';
  exception when insufficient_privilege then res := res || 'T45 A non carica nel bucket portfolio=true; '; end;
  select count(*) into n from storage.objects where bucket_id = 'portfolio'; res := res || 'T55 A non vede gli oggetti del portfolio=' || (n = 0) || '; ';
  select count(*) into n from public.notifications where user_id <> a; res := res || 'T46 A non vede le notifiche altrui=' || (n = 0) || '; ';
  update public.notifications set read_at = now() where id > 0; get diagnostics n = row_count; res := res || 'T47 A segna come lette le sue=' || (n >= 2) || '; ';
  begin update public.notifications set kind = 'manomesso' where id > 0; res := res || 'T48 A non altera altre colonne=false; ';
  exception when insufficient_privilege then res := res || 'T48 A non altera altre colonne=true; '; end;
  execute 'reset role';

  -- Anonimo: niente funzione di cambio stato, niente upload nel portfolio
  execute 'set local role anon';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin perform public.change_request_status(ra, 'chiuso', null); res := res || 'T49 anon non usa change_request_status=false; ';
  exception when insufficient_privilege then res := res || 'T49 anon non usa change_request_status=true; '; end;
  begin insert into storage.objects (bucket_id, name) values ('portfolio', 'test/anon.png'); res := res || 'T50 anon non carica nel bucket portfolio=false; ';
  exception when insufficient_privilege then res := res || 'T50 anon non carica nel bucket portfolio=true; '; end;
  execute 'reset role';

  -- Admin: vede solo le proprie notifiche
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  select count(*) into n from public.notifications where user_id <> adm; res := res || 'T51 admin non vede le notifiche altrui=' || (n = 0) || '; ';
  execute 'reset role';

  -- Ultimo admin: il ruolo non si toglie (trigger profiles_protect_last_admin), nemmeno senza RLS
  update public.profiles set role = 'cliente' where role = 'admin' and id <> adm;
  begin update public.profiles set role = 'cliente' where id = adm; res := res || 'T52 ultimo admin protetto=false; ';
  exception when check_violation then res := res || 'T52 ultimo admin protetto=true; '; end;
  update public.profiles set role = 'admin' where id = a;
  update public.profiles set role = 'cliente' where id = adm; get diagnostics n = row_count;
  res := res || 'T53 con due admin se ne puo togliere uno=' || (n = 1);

  raise exception 'RISULTATI: %', res;
end;
$$;
