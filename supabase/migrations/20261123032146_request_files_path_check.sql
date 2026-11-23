-- Un file registrato deve stare nella cartella della propria richiesta: `<request_id>/<nome>`.
-- La policy di insert su request_files controllava solo proprietà della richiesta e uploaded_by:
-- un cliente poteva registrare, sulla propria richiesta, il percorso Storage di un file altrui.
-- (Il download resta bloccato dalle policy dello Storage, ma il worker di copia Q19 leggerebbe
-- storage_path con privilegi alti.) Il vincolo chiude il varco, senza toccare le policy esistenti.
alter table public.request_files
  add constraint request_files_path_matches_request
  check (storage_path like request_id::text || '/%');
