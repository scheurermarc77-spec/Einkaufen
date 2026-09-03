-- Familien Einkauf v23 – Produktfotos
-- EINMAL im Supabase SQL Editor ausführen, bevor die Foto-Funktion verwendet wird.
-- Bestehende Produkte und Einkaufslisten bleiben erhalten.

begin;

alter table public.catalog_products
  add column if not exists image_path text;

-- Öffentlicher Storage-Bucket für Produktbilder.
-- Die App verkleinert Fotos vor dem Upload auf max. 1200 px und speichert sie als JPEG.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Die Familien-App arbeitet wie bisher ohne Benutzer-Login mit dem Publishable/Anon-Key.
-- Deshalb erhält dieser eine auf den Bucket product-images begrenzte Berechtigung.
drop policy if exists "family_shop_product_images_insert" on storage.objects;
create policy "family_shop_product_images_insert"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'product-images');

drop policy if exists "family_shop_product_images_update" on storage.objects;
create policy "family_shop_product_images_update"
on storage.objects for update
to anon, authenticated
using (bucket_id = 'product-images')
with check (bucket_id = 'product-images');

drop policy if exists "family_shop_product_images_delete" on storage.objects;
create policy "family_shop_product_images_delete"
on storage.objects for delete
to anon, authenticated
using (bucket_id = 'product-images');

drop policy if exists "family_shop_product_images_select" on storage.objects;
create policy "family_shop_product_images_select"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'product-images');

commit;
