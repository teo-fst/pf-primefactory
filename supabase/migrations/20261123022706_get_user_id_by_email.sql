-- Ricerca affidabile dell'id utente a partire dall'email, per il modulo lista d'interesse (Q11).
-- Serve al server (chiave segreta) per riusare un account già esistente senza scorrere tutti gli utenti.
-- Sicurezza: security definer, ma eseguibile SOLO da service_role. anon e authenticated non possono
-- chiamarla (nemmeno via /rest/v1/rpc), quindi dall'esterno non è un modo per sapere se un'email esiste.
create or replace function public.get_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id
  from auth.users u
  where u.email = lower(p_email) and u.deleted_at is null
  limit 1;
$$;

revoke execute on function public.get_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.get_user_id_by_email(text) to service_role;
