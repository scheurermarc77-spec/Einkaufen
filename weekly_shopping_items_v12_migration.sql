-- Migration von der bisherigen Wochenlogik zur dauerhaften persönlichen Grundliste.
-- Die Spalte week_start bleibt technisch bestehen, wird aber nicht mehr verwendet.
-- Damit bestehende Daten erhalten bleiben, ist keine Tabelle neu anzulegen.

-- week_start darf künftig leer sein:
alter table public.weekly_shopping_items
alter column week_start drop not null;

-- Optional: vorhandene Einträge aus verschiedenen Wochen zusammenführen.
-- Doppelte Produkte pro Person werden dabei NICHT automatisch gelöscht,
-- damit keine bestehenden Daten unbeabsichtigt verloren gehen.

-- Index für schnelle persönliche Listen:
create index if not exists weekly_shopping_items_owner_idx
on public.weekly_shopping_items (owner);

-- Bestehende Realtime- und RLS-Einstellungen bleiben erhalten.
