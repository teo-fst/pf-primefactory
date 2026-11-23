-- F1.10 Notifiche: coda di eventi (outbox) alimentata da trigger, più le funzioni per il processore.
-- Migrazione solo additiva: crea una tabella, funzioni e trigger nuovi; non modifica né cancella nulla di esistente.
--
-- Perché un'outbox: gli eventi (nuova richiesta, cambio stato, messaggi, file) nascono nel database,
-- quindi non dipendono dal codice dell'area clienti o del pannello admin. Un processore lato server
-- (src/lib/notify/) legge la coda e invia email e messaggi Telegram.

-- 1. Tabella outbox. Solo service_role: RLS attiva, NESSUNA policy, privilegi tolti ad anon e authenticated.
create table public.notification_outbox (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in (
    'request_created', 'status_changed', 'message_from_customer', 'message_from_admin', 'file_uploaded'
  )),
  request_id uuid references public.requests (id) on delete cascade,
  -- Dati MINIMI: codice pubblico, linea, id tecnici. Mai nome, email, telefono, testi di messaggi o nomi di file.
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  attempts smallint not null default 0,
  last_error text check (char_length(last_error) <= 500),
  -- Backoff e "lease": il processore non riprende una riga prima di questa data.
  next_attempt_at timestamptz not null default now(),
  -- Consegne già riuscite di questo evento (es. 'customer_email'): un nuovo tentativo non le ripete.
  delivered text[] not null default '{}'
);
create index notification_outbox_pending_idx on public.notification_outbox (next_attempt_at, id)
  where processed_at is null;
create index notification_outbox_request_idx on public.notification_outbox (request_id);

alter table public.notification_outbox enable row level security;
revoke all on public.notification_outbox from public, anon, authenticated;
grant all on public.notification_outbox to service_role;

-- 2. Funzioni del processore (solo service_role). Stesso schema di get_user_id_by_email.

-- Prende un lotto di eventi da inviare. "for update skip locked" evita che due processori
-- (cron e invio del modulo in parallelo) prendano le stesse righe. Poiché ogni chiamata RPC è una
-- transazione a sé, il blocco della riga non basta: la riga viene "affittata" (lease) spostando
-- next_attempt_at di 5 minuti e contando il tentativo. Se il processore muore a metà, la riga
-- torna disponibile da sola alla scadenza.
create or replace function public.notify_claim_batch(p_limit integer default 10)
returns setof public.notification_outbox
language sql
security definer
set search_path = ''
as $$
  with picked as (
    select o.id
    from public.notification_outbox o
    where o.processed_at is null
      and o.attempts < 5
      and o.next_attempt_at <= now()
    order by o.id
    limit least(greatest(p_limit, 1), 50)
    for update skip locked
  )
  update public.notification_outbox o
     set attempts = o.attempts + 1,
         next_attempt_at = now() + interval '5 minutes'
    from picked
   where o.id = picked.id
  returning o.*;
$$;

-- Evento consegnato: segna la data e le consegne fatte.
create or replace function public.notify_mark_done(p_id bigint, p_delivered text[])
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notification_outbox
     set processed_at = now(),
         last_error = null,
         delivered = coalesce(p_delivered, '{}')
   where id = p_id and processed_at is null;
$$;

-- Tentativo fallito: registra l'errore (solo codice, mai dati personali), le consegne già riuscite
-- e quando riprovare (il calcolo del backoff è nel codice, src/lib/notify/backoff.ts).
create or replace function public.notify_mark_failed(
  p_id bigint,
  p_error text,
  p_next_attempt_at timestamptz,
  p_delivered text[]
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notification_outbox
     set last_error = left(coalesce(p_error, 'errore'), 500),
         next_attempt_at = p_next_attempt_at,
         delivered = coalesce(p_delivered, '{}')
   where id = p_id and processed_at is null;
$$;

revoke execute on function public.notify_claim_batch(integer) from public, anon, authenticated;
revoke execute on function public.notify_mark_done(bigint, text[]) from public, anon, authenticated;
revoke execute on function public.notify_mark_failed(bigint, text, timestamptz, text[]) from public, anon, authenticated;
grant execute on function public.notify_claim_batch(integer) to service_role;
grant execute on function public.notify_mark_done(bigint, text[]) to service_role;
grant execute on function public.notify_mark_failed(bigint, text, timestamptz, text[]) to service_role;

-- 3. Trigger. Funzioni security definer con search_path vuoto, nello schema private come le altre;
-- nessuno le può chiamare a mano (execute tolto a public, anon, authenticated).
-- Se l'inserimento nell'outbox fallisse, fallirebbe anche l'operazione che l'ha generato: così un evento
-- non va perso in silenzio (la coda è nella stessa transazione della richiesta).

-- 3a. Nuova richiesta: conferma al cliente, avviso ai soci (email + Telegram) e notifica in-app per ogni admin.
create or replace function private.notify_request_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_line text;
begin
  select l.slug into v_line from public.business_lines l where l.id = new.business_line_id;

  insert into public.notification_outbox (event_type, request_id, payload)
  values ('request_created', new.id, jsonb_build_object(
    'public_code', new.public_code, 'line_slug', v_line, 'customer_id', new.customer_id
  ));

  insert into public.notifications (user_id, kind, request_id, payload)
  select p.id, 'request_created', new.id, jsonb_build_object('public_code', new.public_code, 'line_slug', v_line)
  from public.profiles p
  where p.role = 'admin';

  return new;
end;
$$;

-- 3b. Cambio di stato: avviso al cliente solo se lo stato di arrivo ha notify_client (Q13).
create or replace function private.notify_status_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.request_statuses s where s.code = new.status and s.notify_client) then
    insert into public.notification_outbox (event_type, request_id, payload)
    values ('status_changed', new.id, jsonb_build_object(
      'public_code', new.public_code,
      'from_status', old.status,
      'to_status', new.status,
      'customer_id', new.customer_id
    ));
  end if;
  return new;
end;
$$;

-- 3c. Messaggio: del cliente avvisa gli admin, di un admin (non interno) avvisa il cliente, le note interne niente.
create or replace function private.notify_message_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
  v_code text;
  v_customer uuid;
begin
  if new.internal then
    return new;
  end if;

  select r.public_code, r.customer_id into v_code, v_customer
  from public.requests r where r.id = new.request_id;
  select p.role into v_role from public.profiles p where p.id = new.author_id;

  if v_role in ('admin', 'operatore') then
    insert into public.notification_outbox (event_type, request_id, payload)
    values ('message_from_admin', new.request_id, jsonb_build_object(
      'public_code', v_code, 'customer_id', v_customer, 'message_id', new.id
    ));
  elsif v_role = 'cliente' then
    insert into public.notification_outbox (event_type, request_id, payload)
    values ('message_from_customer', new.request_id, jsonb_build_object(
      'public_code', v_code, 'message_id', new.id
    ));
    insert into public.notifications (user_id, kind, request_id, payload)
    select p.id, 'message_from_customer', new.request_id, jsonb_build_object('public_code', v_code)
    from public.profiles p
    where p.role = 'admin';
  end if;

  return new;
end;
$$;

-- 3d. File caricato dal cliente (o dal server): avviso ai soci. Se la stessa richiesta ha già un avviso
-- "file caricato" non ancora preso in carico dal processore, non ne crea un altro ma aumenta file_count:
-- dieci file caricati di seguito diventano un solo avviso, non dieci email e dieci messaggi Telegram.
-- I file caricati da admin/operatore non avvisano nessuno.
create or replace function private.notify_file_uploaded()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
  v_code text;
  v_line text;
  v_pending bigint;
begin
  select p.role into v_role from public.profiles p where p.id = new.uploaded_by;
  if v_role in ('admin', 'operatore') then
    return new;
  end if;

  select o.id into v_pending
  from public.notification_outbox o
  where o.event_type = 'file_uploaded'
    and o.request_id = new.request_id
    and o.processed_at is null
    and o.attempts = 0
  order by o.id desc
  limit 1
  for update skip locked;

  if v_pending is not null then
    update public.notification_outbox o
       set payload = jsonb_set(o.payload, '{file_count}', to_jsonb(coalesce((o.payload ->> 'file_count')::integer, 1) + 1))
     where o.id = v_pending;
    return new;
  end if;

  select r.public_code, l.slug into v_code, v_line
  from public.requests r
  join public.business_lines l on l.id = r.business_line_id
  where r.id = new.request_id;

  insert into public.notification_outbox (event_type, request_id, payload)
  values ('file_uploaded', new.request_id, jsonb_build_object(
    'public_code', v_code, 'line_slug', v_line, 'file_count', 1
  ));

  insert into public.notifications (user_id, kind, request_id, payload)
  select p.id, 'file_uploaded', new.request_id, jsonb_build_object('public_code', v_code)
  from public.profiles p
  where p.role = 'admin';

  return new;
end;
$$;

revoke execute on function private.notify_request_created() from public, anon, authenticated;
revoke execute on function private.notify_status_changed() from public, anon, authenticated;
revoke execute on function private.notify_message_created() from public, anon, authenticated;
revoke execute on function private.notify_file_uploaded() from public, anon, authenticated;

create trigger requests_notify_created after insert on public.requests
  for each row execute function private.notify_request_created();
create trigger requests_notify_status after update of status on public.requests
  for each row when (old.status is distinct from new.status)
  execute function private.notify_status_changed();
create trigger request_messages_notify after insert on public.request_messages
  for each row execute function private.notify_message_created();
create trigger request_files_notify after insert on public.request_files
  for each row execute function private.notify_file_uploaded();
