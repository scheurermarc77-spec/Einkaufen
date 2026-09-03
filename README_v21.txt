Familien Einkauf v21 – Mengen und Masseinheiten

NEU IN v21
- Bei jedem Produkt wird vor dem Hinzufügen eine Menge eingegeben.
- Zwei Angaben: Zahl und Masseinheit.
- Die Masseinheit wird sinnvoll vorgeschlagen und kann per Dropdown geändert werden.
- Bestehende Grundprodukte erhalten passende Standard-Masseinheiten.
- Neue Produkte erhalten automatisch einen Vorschlag für die Standard-Masseinheit.
- Die Standard-Masseinheit eines Produkts kann in der Katalogverwaltung geändert werden.
- Bereits eingetragene Mengen können direkt auf der Einkaufsliste geändert werden.
- Die Funktion gilt für die gemeinsame Einkaufsliste und für den persönlichen Wocheneinkauf.

WICHTIG: UPDATE VON v20 AUF v21
1. In Supabase den SQL Editor öffnen.
2. Den gesamten Inhalt von "supabase_v21_mengen_einrichten.sql" EINMAL ausführen.
   Die Migration ergänzt nur neue Felder und löscht keine Produkte oder Einkaufslisten.
3. Danach auf GitHub die bisherige index.html durch die neue index.html aus diesem Paket ersetzen.
4. manifest.webmanifest und die drei Icon-Dateien können unverändert bleiben.

Die Datei "katalog_v20_einrichten.sql" ist die bisherige Katalog-Einrichtung und bleibt nur als Referenz im Paket.
