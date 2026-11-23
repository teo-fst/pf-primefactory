-- F1.9 pannello admin: cambio stato con nota e protezione dell'ultimo admin.
-- Migrazione solo additiva: nuove funzioni e nuovi trigger, nessuna tabella o colonna toccata.

-- 1) Nota sul cambio di stato (Q13).
-- Lo storico lo scrive già il trigger private.log_request_status. La nota viaggia in una variabile
-- locale alla transazione (pf.status_note) e un trigger BEFORE INSERT dedicato la copia sulla riga
-- di storico appena creata. Il trigger esistente non viene modificato.
create or replace function private.apply_status_note()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_note text;
begin
  v_note := nullif(btrim(coalesce(current_setting('pf.status_note', true), '')), '');
  if new.note is null and v_note is not null then
    new.note := v_note;
  end if;
  return new;
end;
$$;
revoke execute on function private.apply_status_note() from public, anon, authenticated;

create trigger request_status_history_note before insert on public.request_status_history
  for each row execute function private.apply_status_note();

-- Cambio stato + nota in un'unica operazione. SECURITY INVOKER: la RLS decide chi può aggiornare
-- le richieste (solo admin). Un cliente che la chiama riceve 42501 e non cambia nulla.
create or replace function public.change_request_status(
  p_request_id uuid,
  p_status text,
  p_note text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_current text;
  v_rows integer;
begin
  if v_note is not null and char_length(v_note) > 1000 then
    raise exception 'nota_troppo_lunga' using errcode = '22001';
  end if;

  select r.status into v_current from public.requests r where r.id = p_request_id;
  if not found then
    raise exception 'richiesta_non_accessibile' using errcode = '42501';
  end if;
  if v_current = p_status then
    raise exception 'stato_invariato' using errcode = 'P0001';
  end if;

  perform set_config('pf.status_note', coalesce(v_note, ''), true);
  update public.requests set status = p_status where id = p_request_id;
  get diagnostics v_rows = row_count;
  perform set_config('pf.status_note', '', true);

  if v_rows = 0 then
    raise exception 'richiesta_non_accessibile' using errcode = '42501';
  end if;
end;
$$;
revoke execute on function public.change_request_status(uuid, text, text) from public, anon;
grant execute on function public.change_request_status(uuid, text, text) to authenticated;

-- 2) L'ultimo admin non può perdere il ruolo (Q37), nemmeno con la chiave segreta
-- (che salta la RLS ma non i trigger).
create or replace function private.protect_last_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'admin' and new.role <> 'admin'
     and not exists (select 1 from public.profiles p where p.role = 'admin' and p.id <> old.id) then
    raise exception 'ultimo_admin' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke execute on function private.protect_last_admin() from public, anon, authenticated;

create trigger profiles_protect_last_admin before update of role on public.profiles
  for each row when (old.role is distinct from new.role)
  execute function private.protect_last_admin();
