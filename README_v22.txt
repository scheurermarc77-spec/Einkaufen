Familien Einkauf – Version 22

Neu in v22:
- Produktsuche priorisiert Treffer, die mit dem eingegebenen Suchtext beginnen.
- Innerhalb derselben Treffergruppe werden Produkte alphabetisch sortiert.
- Danach folgen Treffer, bei denen der Suchtext nur innerhalb des Produktnamens vorkommt.
- Treffer nur über Kategorie oder Untergruppe folgen zuletzt.
- Diese Sortierung gilt sowohl in der normalen Produktsuche als auch unter «Katalog verwalten».

Beispiel:
Suche «na» -> Nasivin erscheint vor Ananas.

Die Mengen-/Masseinheiten-Funktionen aus v21 bleiben unverändert.
Für v22 ist keine neue Supabase-Anpassung nötig. Falls die Mengenfelder noch nicht eingerichtet wurden, einmalig supabase_v21_mengen_einrichten.sql ausführen.
