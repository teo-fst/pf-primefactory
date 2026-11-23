-- 1) Il piano gratuito di Supabase ha un tetto globale di 50 MB per file, sotto i 100 MB
--    previsti (Q10). Il bucket e l'impostazione dell'app scendono a 50 MB finché il progetto
--    resta sul piano gratuito. Con il piano Pro: riportare entrambi a 104857600.
update storage.buckets set file_size_limit = 52428800 where id = 'request-files';
update public.site_settings set value = '52428800'::jsonb where key = 'max_upload_bytes';

-- 2) Il cliente registra i propri file con un insert su request_files, ma poteva valorizzare
--    anche i campi di sistema (synced_at, backed_up_at, cloud_deleted_at), usati dal processo
--    di copia sul server interno. Insert limitato alle sole colonne descrittive.
revoke insert on public.request_files from authenticated;
grant insert (request_id, storage_path, original_name, size_bytes, mime_type, uploaded_by)
  on public.request_files to authenticated;
