Familien Einkauf – v29

Änderung in v29:
- Die Mengenangabe ist standardmässig leer.
- Eine Menge ist optional. Produkte können auch ohne Zahl auf die Liste gesetzt werden.
- Wenn keine Zahl eingetragen wird, wird auf der Liste nur die Masseinheit angezeigt, z. B. «Stück».
- Wird eine Zahl eingegeben, muss sie grösser als 0 sein.
- Die Änderung gilt auch beim Registrieren neuer Produkte und beim späteren Bearbeiten der Menge.
- Alle Funktionen aus v28 bleiben erhalten, insbesondere Produktfotos, Grossansicht, priorisierte Produktsuche und die persönliche Einkaufsliste.

WICHTIG – Supabase einmalig anpassen:
1. In Supabase den SQL Editor öffnen.
2. Den Inhalt von «supabase_v29_leere_menge_erlauben.sql» einfügen.
3. Auf «Run» drücken.

Die bisherigen Supabase-Dateien v20, v21 und v23 bleiben im Paket, damit eine neue Installation vollständig eingerichtet werden kann.
Bei einer bestehenden v28-Installation muss nur die neue v29-SQL-Datei zusätzlich ausgeführt werden.

Für GitHub:
- Den Inhalt dieses Ordners hochladen.
- «index.html» ist die aktuelle App-Datei der Version 29.
