-- Familien Einkauf v29 – Mengenangabe optional
-- Einmal im Supabase SQL Editor ausführen.
-- Bestehende Mengen bleiben unverändert.

begin;

alter table public.shopping_items
  alter column quantity drop not null,
  alter column quantity drop default;

alter table public.weekly_shopping_items
  alter column quantity drop not null,
  alter column quantity drop default;

commit;
