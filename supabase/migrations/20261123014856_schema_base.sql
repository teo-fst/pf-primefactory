-- Schema base Fase 1: ruoli, profili, linee di business, pagine, testi, impostazioni.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.app_role as enum ('admin', 'operatore', 'cliente');
create type public.visibility as enum ('attiva', 'in_sviluppo', 'oscurata');

-- Aggiornamento automatico di updated_at
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Profili: uno per utente di auth.users
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'cliente',
  full_name text not null default '' check (char_length(full_name) <= 200),
  phone text check (char_length(phone) <= 40),
  locale text not null default 'it' check (locale in ('it', 'en', 'fr', 'es')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- Funzioni di ruolo (security definer: leggono profiles senza ricorsione RLS)
create or replace function private.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = (select auth.uid());
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select private.current_app_role()) = 'admin', false);
$$;

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select private.current_app_role()) in ('admin', 'operatore'), false);
$$;

-- anon serve perché le policy pubbliche valutano is_admin() (restituisce false senza login)
grant usage on schema private to anon, authenticated;
revoke execute on all functions in schema private from public, anon;
grant execute on function private.current_app_role(), private.is_admin(), private.is_staff() to anon, authenticated;

-- Profilo creato alla registrazione
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone, locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone',
    case when new.raw_user_meta_data ->> 'locale' in ('it', 'en', 'fr', 'es')
         then new.raw_user_meta_data ->> 'locale' else 'it' end
  );
  return new;
end;
$$;
revoke execute on function private.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- Il cliente modifica solo nome, telefono e lingua; il ruolo si cambia lato server con la chiave segreta.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, phone, locale) on public.profiles to authenticated;

-- Linee di business
create table public.business_lines (
  id smallint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  visibility public.visibility not null default 'in_sviluppo',
  accepts_requests boolean not null default true,
  sort smallint not null default 0,
  name_it text not null,
  name_en text not null,
  summary_it text not null default '',
  summary_en text not null default '',
  -- Campi aggiuntivi del modulo (Q43): array di {key,type,label_it,label_en,required,options}
  form_schema jsonb not null default '[]'::jsonb check (jsonb_typeof(form_schema) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger business_lines_updated_at before update on public.business_lines
  for each row execute function private.set_updated_at();

-- Pagine con interruttore di visibilità (Q34)
create table public.pages (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  visibility public.visibility not null default 'in_sviluppo',
  sort smallint not null default 0,
  title_it text not null,
  title_en text not null,
  updated_at timestamptz not null default now()
);
create trigger pages_updated_at before update on public.pages
  for each row execute function private.set_updated_at();

-- Testi modificabili dal pannello (Q33)
create table public.site_texts (
  key text not null check (key ~ '^[a-z0-9_.-]+$'),
  locale text not null check (locale in ('it', 'en', 'fr', 'es')),
  value text not null,
  updated_at timestamptz not null default now(),
  primary key (key, locale)
);
create trigger site_texts_updated_at before update on public.site_texts
  for each row execute function private.set_updated_at();

-- Impostazioni globali (es. quote_mode: lista d'interesse ↔ preventivi, Q8)
create table public.site_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);
create trigger site_settings_updated_at before update on public.site_settings
  for each row execute function private.set_updated_at();

alter table public.business_lines enable row level security;
alter table public.pages enable row level security;
alter table public.site_texts enable row level security;
alter table public.site_settings enable row level security;

create policy business_lines_public_read on public.business_lines for select to anon, authenticated
  using (visibility = 'attiva' or (select private.is_admin()));
create policy business_lines_admin_write on public.business_lines for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy pages_public_read on public.pages for select to anon, authenticated
  using (visibility = 'attiva' or (select private.is_admin()));
create policy pages_admin_write on public.pages for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy site_texts_public_read on public.site_texts for select to anon, authenticated
  using (true);
create policy site_texts_admin_write on public.site_texts for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy site_settings_read on public.site_settings for select to anon, authenticated
  using (is_public or (select private.is_admin()));
create policy site_settings_admin_write on public.site_settings for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
