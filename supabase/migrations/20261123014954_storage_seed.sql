-- Bucket di Storage, policy relative e dati iniziali.

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('request-files', 'request-files', false, 104857600),
  ('portfolio', 'portfolio', true, 10485760)
on conflict (id) do nothing;

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
where id = 'portfolio';

-- Percorso dei file cliente: request-files/<request_id>/<nome>
create or replace function private.owns_request_path(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.requests r
    where r.id::text = (storage.foldername(p_name))[1]
      and r.customer_id = (select auth.uid())
  );
$$;
revoke execute on function private.owns_request_path(text) from public, anon;
grant execute on function private.owns_request_path(text) to authenticated;

create policy request_files_obj_select on storage.objects for select to authenticated
  using (bucket_id = 'request-files' and ((select private.is_admin()) or (select private.owns_request_path(name))));
create policy request_files_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'request-files' and ((select private.is_admin()) or (select private.owns_request_path(name))));
create policy request_files_obj_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'request-files' and (select private.is_admin()))
  with check (bucket_id = 'request-files' and (select private.is_admin()));
create policy request_files_obj_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'request-files' and (select private.is_admin()));

create policy portfolio_obj_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'portfolio' and (select private.is_admin()));
create policy portfolio_obj_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'portfolio' and (select private.is_admin()))
  with check (bucket_id = 'portfolio' and (select private.is_admin()));
create policy portfolio_obj_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'portfolio' and (select private.is_admin()));

-- Stati (Q13)
insert into public.request_statuses (code, sort, label_it, label_en, visible_to_client, notify_client, is_terminal) values
  ('richiesta',          10, 'Richiesta ricevuta',  'Request received',   true,  true,  false),
  ('file_ricevuti',      20, 'File ricevuti',       'Files received',     true,  true,  false),
  ('in_valutazione',     30, 'In valutazione',      'Under review',       true,  true,  false),
  ('preventivo_inviato', 40, 'Preventivo inviato',  'Quote sent',         true,  true,  false),
  ('accettato',          50, 'Accettato',           'Accepted',           true,  true,  false),
  ('rifiutato',          51, 'Rifiutato',           'Declined',           true,  true,  true),
  ('scaduto',            52, 'Scaduto',             'Expired',            true,  true,  true),
  ('in_produzione',      60, 'In produzione',       'In production',      true,  true,  false),
  ('controllo_qualita',  70, 'Controllo qualità',   'Quality check',      true,  false, false),
  ('pronto',             80, 'Pronto',              'Ready',              true,  true,  false),
  ('consegnato',         90, 'Consegnato',          'Delivered',          true,  true,  false),
  ('spedito',            91, 'Spedito',             'Shipped',            true,  true,  false),
  ('chiuso',            100, 'Chiuso',              'Closed',             true,  false, true);

-- Linee di business (Q2, Q43)
insert into public.business_lines (slug, visibility, accepts_requests, sort, name_it, name_en, summary_it, summary_en, form_schema) values
  ('moto-bici', 'attiva', true, 10, 'Moto e bici', 'Motorcycles and bicycles',
   'Accessori da pista, ricambi per moto d''epoca, parti custom, carene e componenti per bici ed e-bike.',
   'Track accessories, vintage motorcycle parts, custom parts, fairings and bicycle and e-bike components.',
   '[
     {"key":"marca","type":"text","label_it":"Marca","label_en":"Make","required":true},
     {"key":"modello","type":"text","label_it":"Modello","label_en":"Model","required":true},
     {"key":"anno","type":"number","label_it":"Anno","label_en":"Year","required":false},
     {"key":"uso","type":"select","label_it":"Uso","label_en":"Use","required":true,
      "options":[{"value":"pista","label_it":"Pista","label_en":"Track"},{"value":"strada","label_it":"Strada","label_en":"Road"},{"value":"epoca","label_it":"Epoca","label_en":"Vintage"}]}
   ]'::jsonb),
  ('progettazione', 'attiva', true, 20, 'Progettazione e scansione', 'Design and scanning',
   'Modellazione CAD conto terzi, scansione 3D e reverse engineering, con rilascio del modello o stampa.',
   'Contract CAD modelling, 3D scanning and reverse engineering, delivered as a model file or a print.',
   '[
     {"key":"servizio","type":"select","label_it":"Servizio","label_en":"Service","required":true,
      "options":[{"value":"cad","label_it":"Modello CAD","label_en":"CAD model"},{"value":"stampa","label_it":"Stampa","label_en":"Print"},{"value":"scansione","label_it":"Scansione 3D","label_en":"3D scan"},{"value":"reverse","label_it":"Reverse engineering","label_en":"Reverse engineering"}]},
     {"key":"file_modello","type":"boolean","label_it":"Voglio ricevere il file del modello","label_en":"I want the model file","required":false}
   ]'::jsonb),
  ('gioielleria', 'attiva', true, 30, 'Gioielleria', 'Jewellery',
   'Gioielli su commissione in microfusione a cera persa: argento, oro, bronzo e ottone.',
   'Commissioned lost-wax cast jewellery in silver, gold, bronze and brass.',
   '[
     {"key":"metallo","type":"select","label_it":"Metallo","label_en":"Metal","required":true,
      "options":[{"value":"argento","label_it":"Argento","label_en":"Silver"},{"value":"oro","label_it":"Oro","label_en":"Gold"},{"value":"bronzo","label_it":"Bronzo","label_en":"Bronze"},{"value":"ottone","label_it":"Ottone","label_en":"Brass"}]},
     {"key":"misura","type":"text","label_it":"Misura","label_en":"Size","required":false},
     {"key":"occasione","type":"text","label_it":"Occasione o data","label_en":"Occasion or date","required":false}
   ]'::jsonb),
  ('riciclo', 'attiva', false, 40, 'Riciclo dei polimeri', 'Polymer recycling',
   'Recupero degli scarti di produzione e filamento riciclato per test e stampe non tecniche.',
   'Recovery of production waste and recycled filament for tests and non-technical prints.',
   '[]'::jsonb),
  ('siti-web-reti', 'oscurata', true, 50, 'Siti web e reti', 'Websites and networks',
   'Siti web per aziende del territorio e progettazione di reti.',
   'Websites for local businesses and network design.',
   '[]'::jsonb);

-- Pagine (Q34)
insert into public.pages (slug, visibility, sort, title_it, title_en) values
  ('home', 'attiva', 0, 'Home', 'Home'),
  ('portfolio', 'attiva', 10, 'Portfolio', 'Portfolio'),
  ('chi-siamo', 'attiva', 20, 'Chi siamo', 'About us'),
  ('eventi', 'attiva', 30, 'Eventi', 'Events'),
  ('lista-interesse', 'attiva', 40, 'Lista d''interesse', 'Interest list'),
  ('privacy', 'attiva', 90, 'Privacy', 'Privacy'),
  ('cookie', 'attiva', 91, 'Cookie', 'Cookies'),
  ('termini', 'attiva', 92, 'Termini e condizioni', 'Terms and conditions'),
  ('consenso-riuso', 'attiva', 93, 'Consenso al riuso dei modelli', 'Model reuse consent'),
  ('solo-uso-pista', 'attiva', 94, 'Solo uso pista', 'Track use only');

-- Impostazioni (Q8)
insert into public.site_settings (key, value, is_public) values
  ('quote_mode', 'false'::jsonb, true),
  ('max_upload_bytes', '104857600'::jsonb, true);
