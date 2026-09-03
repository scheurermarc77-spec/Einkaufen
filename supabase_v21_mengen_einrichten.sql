-- Familien Einkauf v21 – Mengen und Masseinheiten
-- NUR EINMAL im Supabase SQL Editor ausführen, bevor index.html v21 verwendet wird.
-- Diese Migration löscht keine bestehenden Einkaufslisten oder Produkte.

begin;

alter table public.catalog_products
  add column if not exists default_unit text default 'Stück';

alter table public.shopping_items
  add column if not exists quantity numeric default 1,
  add column if not exists unit text default 'Stück';

alter table public.weekly_shopping_items
  add column if not exists quantity numeric default 1,
  add column if not exists unit text default 'Stück';

-- Sinnvolle Standard-Masseinheiten für den mitgelieferten Grundkatalog.
update public.catalog_products
set default_unit = case
    when product_name in ('Basilikum', 'Bulgur', 'Butter', 'Cashews', 'Champignons', 'Cherry-Tomaten', 'Chili', 'Chips', 'Cornflakes', 'Couscous', 'Cracker', 'Crevetten', 'Crème fraîche', 'Curry', 'Emmentaler', 'Erdbeeren', 'Erdnussbutter', 'Filterkaffee', 'Frischkäse', 'Fruchtjoghurt', 'Fusilli', 'Gnocchi', 'Gouda', 'Granola', 'Gummibärchen', 'Haferflocken', 'Heidelbeeren', 'Himbeeren', 'Honig', 'Hummus', 'Kaffeebohnen', 'Kakao', 'Kakaopulver', 'Kalbfleisch', 'Kekse') then 'g'
    when product_name in ('Kichererbsen', 'Kidneybohnen', 'Konfitüre', 'Lachs', 'Lasagneblätter', 'Linsen', 'Mais', 'Maizena', 'Mandeln', 'Margarine', 'Mehl', 'Mozzarella', 'Müesli', 'Naturjoghurt', 'Nutella', 'Nüsse', 'Oregano', 'Paniermehl', 'Paprika', 'Parmesan', 'Penne', 'Pfeffer', 'Polenta', 'Pommes frites', 'Popcorn', 'Pouletbrust', 'Puderzucker', 'Quark', 'Quinoa', 'Ravioli', 'Reis', 'Rindshackfleisch', 'Rindssteak', 'Risottoreis', 'Rohrzucker') then 'g'
    when product_name in ('Rucola', 'Salami', 'Salz', 'Schinken', 'Schokolade', 'Schokoladenwürfel', 'Schweinefleisch', 'Skyr', 'Spaghetti', 'Speck', 'Spinat', 'Tempeh', 'Thunfisch', 'TK-Beeren', 'TK-Gemüse', 'TK-Kräuter', 'Tofu', 'Tomaten', 'Tortellini', 'Trauben', 'Vanillezucker', 'Veganes Hack', 'Weisse Bohnen', 'Zimt', 'Zucker') then 'g'
    when product_name in ('Grillkohle', 'Karotten', 'Kartoffeln', 'Katzenstreu', 'Süsskartoffeln', 'Tierfutter', 'Zwiebeln') then 'kg'
    when product_name in ('Abwaschmittel', 'Aftershave', 'Ahornsirup', 'Allzweckreiniger', 'Badreiniger', 'Balsamico', 'Bodenreiniger', 'Bodylotion', 'Conditioner', 'Deodorant', 'Desinfektionsmittel', 'Duschgel', 'Enteiser', 'Entkalker', 'Essig', 'Feinwaschmittel', 'Fleckentferner', 'Gesichtscreme', 'Glasreiniger', 'Haargel', 'Haarspray', 'Handcreme', 'Klarspüler', 'Küchenreiniger', 'Mundspülung', 'Olivenöl', 'Rahm', 'Rasiergel', 'Rasierschaum', 'Scheuermittel', 'Shampoo', 'Sojasauce', 'Sonnenblumenöl', 'Sonnencreme', 'Tomatensauce') then 'ml'
    when product_name in ('Trockenshampoo', 'Waschmittel Color', 'Waschmittel Weiss', 'WC-Reiniger', 'Weichspüler') then 'ml'
    when product_name in ('Ananassaft', 'Apfelsaft', 'Citro', 'Cola', 'Cola Zero', 'Eistee', 'Ginger Ale', 'Haferdrink', 'Isotonisches Getränk', 'Mandelmilch', 'Milch', 'Mineralwasser mit Kohlensäure', 'Mineralwasser still', 'Motoröl', 'Multivitaminsaft', 'Orangensaft', 'Orangina', 'Rivella', 'Scheibenreiniger', 'Sirup', 'Tonic Water') then 'l'
    when product_name in ('AA-Batterien', 'AAA-Batterien', 'Anzündwürfel', 'Backpulver', 'Binden', 'Bouillon', 'Briefumschläge', 'C-Batterien', 'Chicken Nuggets', 'CR2016 Knopfzelle', 'CR2025 Knopfzelle', 'CR2032 Knopfzelle', 'D-Batterien', 'Druckerpapier', 'Falafel', 'Feuchttücher', 'Fischstäbchen', 'Gefrierbeutel', 'Glace', 'Grüntee', 'Gummihandschuhe', 'Hefe', 'Hundebeutel', 'Interdentalbürsten', 'Kaffeefilter', 'Kamillentee', 'Kehrichtsäcke', 'Knäckebrot', 'Kompostsäcke', 'Küchenschwämme', 'Lasagne', 'LR44 Knopfzelle', 'Mikrofasertücher', 'Müllbeutel', 'Papiertaschentücher Auto') then 'Packung'
    when product_name in ('Pappteller', 'Pfefferminztee', 'Pflaster', 'Picknickbecher', 'Pizza', 'Putzschwämme', 'Rasierklingen', 'Reiswaffeln', 'Schwarztee', 'Servietten', 'Slipeinlagen', 'Spülmaschinen-Tabs', 'Spülmaschinensalz', 'Streichhölzer', 'Tampons', 'Taschentücher', 'Toastbrot', 'Toilettenpapier', 'Tomatenpüree', 'Tortillas', 'Vegane Nuggets', 'Vegiburger', 'Verbandsmaterial', 'Wattepads', 'Wattestäbchen', 'Zahnstocher', 'Zip-Beutel') then 'Packung'
    when product_name in ('Energy Drink', 'Kokosmilch', 'Maisdose', 'Pelati', 'Thunfischdose') then 'Dose'
    when product_name in ('Apfelmus', 'Essiggurken', 'Kapern', 'Ketchup', 'Mayonnaise', 'Oliven', 'Pesto', 'Senf') then 'Glas'
    when product_name in ('Alufolie', 'Backpapier', 'Frischhaltefolie', 'Haushaltpapier') then 'Rolle'
    when product_name in ('Zahnpasta') then 'Tube'
    when product_name in ('9V-Batterie', 'Abwaschbürste', 'Ananas', 'Aprikosen', 'Aubergine', 'Avocado', 'Bananen', 'Birnen', 'Bleistifte', 'Blumenkohl', 'Bratwürste', 'Broccoli', 'Brot', 'Brötchen', 'Cervelat', 'Eier', 'Einwegrasierer', 'Feuerzeug', 'Fieberthermometer-Batterie', 'Gipfeli', 'Gurken', 'Isolierband', 'Kaffeekapseln', 'Kerzen', 'Kiwis', 'Klebeband', 'Klebestift', 'Knoblauch', 'Kugelschreiber', 'Lauch', 'LED-Lampe E14', 'LED-Lampe E27', 'LED-Spot GU10', 'Lightning-Kabel', 'Limetten') then 'Stück'
    when product_name in ('Lippenpflege', 'Mandarinen', 'Mango', 'Mehrfachstecker', 'Melone', 'Nachtlicht', 'Nektarinen', 'Notizblock', 'Orangen', 'Peperoni', 'Pfirsiche', 'Pouletschenkel', 'Pudding', 'Riegel', 'Salat', 'Sellerie', 'Textmarker', 'USB-A Kabel', 'USB-C Kabel', 'Verlängerungskabel', 'Wassermelone', 'Wäschenetz', 'Zahnbürsten', 'Zahnseide', 'Zitronen', 'Zopf', 'Zucchetti', 'Äpfel') then 'Stück'
    -- Fallback für bereits selbst angelegte Produkte:
    when lower(category) = 'getränke' then 'l'
    when lower(subcategory) in ('fleisch & fisch','teigwaren, reis & beilagen','gewürze & backen','frühstück','snacks & süsses','vegetarisch & vegan') then 'g'
    when lower(subcategory) = 'tiefkühl' then 'Packung'
    when lower(subcategory) = 'tierbedarf' then 'kg'
    when lower(category) = 'haushalt' and (lower(subcategory) like '%reinigung%' or lower(subcategory) = 'waschen') then 'ml'
    else 'Stück'
  end;

update public.catalog_products set default_unit = 'Stück' where default_unit is null or btrim(default_unit) = '';
update public.shopping_items set quantity = 1 where quantity is null or quantity <= 0;
update public.weekly_shopping_items set quantity = 1 where quantity is null or quantity <= 0;

-- Bestehende Listeneinträge erhalten die Standard-Einheit ihres Katalogprodukts.
update public.shopping_items s
set unit = c.default_unit
from public.catalog_products c
where lower(s.product_name) = lower(c.product_name)
  and lower(coalesce(s.category,'')) = lower(coalesce(c.category,''))
  and lower(coalesce(s.subcategory,'')) = lower(coalesce(c.subcategory,''));

update public.weekly_shopping_items w
set unit = c.default_unit
from public.catalog_products c
where lower(w.product_name) = lower(c.product_name)
  and lower(coalesce(w.category,'')) = lower(coalesce(c.category,''))
  and lower(coalesce(w.subcategory,'')) = lower(coalesce(c.subcategory,''));

update public.shopping_items set unit = 'Stück' where unit is null or btrim(unit) = '';
update public.weekly_shopping_items set unit = 'Stück' where unit is null or btrim(unit) = '';

alter table public.catalog_products alter column default_unit set default 'Stück';
alter table public.catalog_products alter column default_unit set not null;
alter table public.shopping_items alter column quantity set default 1;
alter table public.shopping_items alter column quantity set not null;
alter table public.shopping_items alter column unit set default 'Stück';
alter table public.shopping_items alter column unit set not null;
alter table public.weekly_shopping_items alter column quantity set default 1;
alter table public.weekly_shopping_items alter column quantity set not null;
alter table public.weekly_shopping_items alter column unit set default 'Stück';
alter table public.weekly_shopping_items alter column unit set not null;

commit;
