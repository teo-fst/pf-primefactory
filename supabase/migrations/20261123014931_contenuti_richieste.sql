-- Portfolio, eventi, documenti legali, richieste con stati, file, messaggi, notifiche.

-- Portfolio (Q16): pubblicabile solo con diritti ceduti alla società
create table public.portfolio_items (
  id bigint generated always as identity primary key,
  business_line_id smallint references public.business_lines (id) on delete set null,
  image_path text not null,
  caption_it text not null default '',
  caption_en text not null default '',
  rights_transferred boolean not null default false,
  published boolean not null default false,
  sort integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portfolio_rights_before_publish check (not published or rights_transferred)
);
create index portfolio_items_business_line_idx on public.portfolio_items (business_line_id);
create index portfolio_items_created_by_idx on public.portfolio_items (created_by);
create trigger portfolio_items_updated_at before update on public.portfolio_items
  for each row execute function private.set_updated_at();

-- Eventi (Q34) con codice fonte per il QR (Q39)
create table public.events (
  id bigint generated always as identity primary key,
  title_it text not null,
  title_en text not null,
  description_it text not null default '',
  description_en text not null default '',
  location text not null default '',
  kind text not null default 'trackday' check (kind in ('trackday', 'motoraduno', 'fiera', 'altro')),
  starts_on date not null,
  ends_on date,
  source_code text not null unique check (source_code ~ '^[a-z0-9-]+$'),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_dates check (ends_on is null or ends_on >= starts_on)
);
create index events_starts_on_idx on public.events (starts_on) where published;
create trigger events_updated_at before update on public.events
  for each row execute function private.set_updated_at();

-- Documenti legali versionati (Q15, Q26)
create table public.legal_documents (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('privacy', 'cookie', 'termini', 'consenso_riuso', 'solo_uso_pista')),
  locale text not null check (locale in ('it', 'en', 'fr', 'es')),
  version integer not null check (version > 0),
  body_md text not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (kind, locale, version)
);

-- Stati delle richieste, configurabili (Q13)
create table public.request_statuses (
  code text primary key check (code ~ '^[a-z_]+$'),
  sort smallint not null,
  label_it text not null,
  label_en text not null,
  visible_to_client boolean not null default true,
  notify_client boolean not null default true,
  is_terminal boolean not null default false
);

create sequence public.request_code_seq;

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  public_code text not null unique
    default ('PF-' || to_char(now(), 'YY') || '-' || lpad(nextval('public.request_code_seq')::text, 4, '0')),
  -- Pre-lancio: la cancellazione dell'account elimina le richieste. Da rivedere in Fase 2 (conservazione 10 anni, Q38).
  customer_id uuid not null references public.profiles (id) on delete cascade,
  business_line_id smallint not null references public.business_lines (id),
  kind text not null default 'interesse' check (kind in ('interesse', 'preventivo')),
  status text not null default 'richiesta' references public.request_statuses (code),
  description text not null check (char_length(description) between 10 and 5000),
  measures text check (char_length(measures) <= 2000),
  deadline date,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  source text check (char_length(source) <= 80),
  privacy_consent_at timestamptz not null,
  privacy_document_id bigint references public.legal_documents (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index requests_customer_idx on public.requests (customer_id, created_at desc);
create index requests_business_line_idx on public.requests (business_line_id);
create index requests_status_idx on public.requests (status, created_at desc);
create index requests_privacy_document_idx on public.requests (privacy_document_id);
create trigger requests_updated_at before update on public.requests
  for each row execute function private.set_updated_at();

create table public.request_status_history (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.requests (id) on delete cascade,
  from_status text references public.request_statuses (code),
  to_status text not null references public.request_statuses (code),
  changed_by uuid references public.profiles (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index request_status_history_request_idx on public.request_status_history (request_id, created_at);
create index request_status_history_changed_by_idx on public.request_status_history (changed_by);
create index request_status_history_from_idx on public.request_status_history (from_status);
create index request_status_history_to_idx on public.request_status_history (to_status);

create or replace function private.log_request_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.request_status_history (request_id, from_status, to_status, changed_by)
    values (new.id, null, new.status, (select auth.uid()));
  elsif new.status is distinct from old.status then
    insert into public.request_status_history (request_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, (select auth.uid()));
  end if;
  return new;
end;
$$;
create trigger requests_status_log after insert or update of status on public.requests
  for each row execute function private.log_request_status();

-- File allegati (Q10, Q19): ciclo cloud → server interno → backup → cancellazione cloud
create table public.request_files (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.requests (id) on delete cascade,
  storage_path text not null unique,
  original_name text not null check (char_length(original_name) <= 255),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 104857600),
  mime_type text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  synced_at timestamptz,
  backed_up_at timestamptz,
  cloud_deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index request_files_request_idx on public.request_files (request_id);
create index request_files_uploaded_by_idx on public.request_files (uploaded_by);
create index request_files_pending_sync_idx on public.request_files (created_at) where synced_at is null;

-- Conversazione per richiesta (Q35); le note interne non sono visibili al cliente
create table public.request_messages (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.requests (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(body) between 1 and 5000),
  internal boolean not null default false,
  created_at timestamptz not null default now()
);
create index request_messages_request_idx on public.request_messages (request_id, created_at);
create index request_messages_author_idx on public.request_messages (author_id);

-- Notifiche in-app (Q27)
create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  request_id uuid references public.requests (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_unread_idx on public.notifications (user_id, created_at desc) where read_at is null;
create index notifications_user_idx on public.notifications (user_id);
create index notifications_request_idx on public.notifications (request_id);

-- Proprietà della richiesta (security definer per evitare ricorsione nelle policy collegate)
create or replace function private.owns_request(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.requests r
    where r.id = p_request_id and r.customer_id = (select auth.uid())
  );
$$;
revoke execute on function private.owns_request(uuid) from public, anon;
grant execute on function private.owns_request(uuid) to authenticated;
revoke execute on function private.log_request_status() from public, anon, authenticated;

-- RLS
alter table public.portfolio_items enable row level security;
alter table public.events enable row level security;
alter table public.legal_documents enable row level security;
alter table public.request_statuses enable row level security;
alter table public.requests enable row level security;
alter table public.request_status_history enable row level security;
alter table public.request_files enable row level security;
alter table public.request_messages enable row level security;
alter table public.notifications enable row level security;

create policy portfolio_public_read on public.portfolio_items for select to anon, authenticated
  using (published or (select private.is_admin()));
create policy portfolio_admin_write on public.portfolio_items for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy events_public_read on public.events for select to anon, authenticated
  using (published or (select private.is_admin()));
create policy events_admin_write on public.events for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy legal_public_read on public.legal_documents for select to anon, authenticated
  using (published_at is not null or (select private.is_admin()));
create policy legal_admin_write on public.legal_documents for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy request_statuses_read on public.request_statuses for select to anon, authenticated
  using (true);
create policy request_statuses_admin_write on public.request_statuses for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Le richieste si creano lato server (chiave segreta) dal modulo pubblico: nessun insert per anon/cliente.
create policy requests_select on public.requests for select to authenticated
  using (customer_id = (select auth.uid()) or (select private.is_admin()));
create policy requests_admin_write on public.requests for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy requests_admin_delete on public.requests for delete to authenticated
  using ((select private.is_admin()));

create policy status_history_select on public.request_status_history for select to authenticated
  using ((select private.is_admin()) or (
    (select private.owns_request(request_id))
    and exists (select 1 from public.request_statuses s where s.code = to_status and s.visible_to_client)
  ));

create policy request_files_select on public.request_files for select to authenticated
  using ((select private.is_admin()) or (select private.owns_request(request_id)));
create policy request_files_insert on public.request_files for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and ((select private.is_admin()) or (select private.owns_request(request_id)))
  );
create policy request_files_admin_write on public.request_files for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy request_files_admin_delete on public.request_files for delete to authenticated
  using ((select private.is_admin()));

create policy request_messages_select on public.request_messages for select to authenticated
  using ((select private.is_admin()) or (not internal and (select private.owns_request(request_id))));
create policy request_messages_insert on public.request_messages for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and ((select private.is_admin()) or (not internal and (select private.owns_request(request_id))))
  );

create policy notifications_select on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_mark_read on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Il cliente non può alterare i campi di sistema dei file
revoke update on public.request_files from authenticated;
grant update (synced_at, backed_up_at, cloud_deleted_at) on public.request_files to authenticated;
