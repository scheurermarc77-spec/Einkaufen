# Familien Einkauf – iPhone-App (PWA)

Diese App ist für Leon, Papi, Mami und Anouk gedacht. Jede Person wählt auf ihrem eigenen iPhone einmal ihren Namen. Alle sehen anschliessend dieselbe Einkaufsliste live.

## Enthalten
- Gemeinsame, live synchronisierte Einkaufsliste
- Profile: Leon, Papi, Mami, Anouk
- Lebensmittel, Getränke, Hygiene, Haushalt, Batterien & Elektro, Sonstiges
- Kategorien und Untergruppen
- Viele vordefinierte Produkte + eigene Produkte
- Anzeige „Eingetragen von …“ mit Datum/Uhrzeit
- Beim Abhaken: „Gekauft von …“ mit Datum/Uhrzeit
- Produkte können wieder auf „offen“ gesetzt oder gelöscht werden
- Gekaufte Produkte können ausgeblendet werden
- Auf iPhone zum Home-Bildschirm hinzufügbar

## Einmalige Einrichtung der Cloud
Die App nutzt Supabase als kostenlose Cloud-Datenbank.

1. Auf supabase.com ein kostenloses Projekt erstellen.
2. Im Supabase-Projekt den SQL Editor öffnen.
3. Den ganzen Inhalt aus `supabase.sql` ausführen.
4. In Supabase unter Project Settings / API die `Project URL` und den `anon public key` kopieren.
5. In `config.js` diese beiden Werte einsetzen.
6. Den gesamten Ordner auf einen HTTPS-Webhost laden (z.B. Netlify, Vercel, GitHub Pages oder eigener Webserver).
7. Auf jedem iPhone die URL in Safari öffnen → Teilen → „Zum Home-Bildschirm“.
8. Beim ersten Start Leon, Papi, Mami oder Anouk wählen.

## Hinweis zur Sicherheit
Diese Familienversion verwendet einen gemeinsamen Haushaltscode und keine Passwörter. Wer die App-URL und den Code kennt, könnte theoretisch auf die Liste zugreifen. Für eine private Familienliste ist das unkompliziert; für stärkeren Schutz kann später ein Login pro Person ergänzt werden.


## Version 6 – Produktdatenbank

Bei der Produktsuche werden weiterhin alle Kategorien und Untergruppen durchsucht.
Falls kein Produkt mit exakt diesem Namen vorhanden ist, kann es direkt aus der Suche
in die gemeinsame Produktdatenbank aufgenommen werden. Dabei werden Kategorie und
Untergruppe ausgewählt. Das neue Produkt ist anschliessend für alle Familienmitglieder
verfügbar und wird direkt auf die Einkaufsliste gesetzt.

Für diese Funktion muss einmalig `catalog_products.sql` im Supabase SQL Editor ausgeführt werden.


## Version 7 – vereinfachte Produktsuche

- Das Hauptfeld heisst neu **Suchen**.
- Beim Suchen werden immer alle Kategorien und Untergruppen berücksichtigt.
- Gefundene Produkte können direkt auf die Einkaufsliste gesetzt werden.
- Ist ein Produkt nicht vorhanden, kann es direkt in die gemeinsame Produktdatenbank aufgenommen werden.
- Dabei wird zuerst die Kategorie und danach die Untergruppe gewählt.
- Falls keine passende Kategorie oder Untergruppe vorhanden ist, kann sie direkt im selben Dialog neu erstellt werden.
- Die separat sichtbare Eingabe «Produktname / Eigenes Produkt» wurde entfernt, da neue Produkte direkt über die Suche angelegt werden.


## Version 8 – übersichtlichere Bedienung

- Einkaufsliste und Einkaufsliste ergänzen sind optisch klar getrennt.
- Mehr Farben, Symbole und erklärende Hinweise machen die App selbsterklärender.
- In der Suche kann der Text mit dem Mikrofon-Button mündlich eingegeben werden (falls der Browser Spracheingabe unterstützt).
- Suchresultate, Gruppen und Statusanzeigen wurden optisch klarer gestaltet.


## Version 9 – Einkaufsliste im Fokus

- Die eigentliche Einkaufsliste steht direkt ganz oben.
- Die grosse Statistik für «Noch kaufen» und «Schon gekauft» wurde entfernt.
- Es gibt nur noch eine kleine Anzeige mit der Anzahl offener Artikel.
- In der Einkaufsliste werden keine Kategorien oder Untergruppen mehr angezeigt.
- Die Liste ist bewusst flach und einfach gehalten; offene Artikel stehen zuerst.


## Version 10 – Vorschläge nur beim Stöbern

- Kategorie- und Untergruppen-Vorschläge erscheinen erst, wenn «Nach Kategorie stöbern» geöffnet wird.
- Solange weder gesucht noch gestöbert wird, bleibt der Vorschlagsbereich leer.
- Die normale Suche durchsucht weiterhin unabhängig davon den gesamten Produktkatalog.


## Version 11 – persönliche Wochenlisten

- Erklärungstexte direkt unter «Einkaufsliste» und «Einkaufsliste ergänzen» wurden entfernt.
- Das Suchfeld hat einen roten Rahmen.
- Über «Gemeinsam» und «Meine Wochenliste» wird zwischen zwei vollständig getrennten Listen gewechselt.
- Für jedes Profil wird automatisch pro Kalenderwoche eine eigene Wochenliste geführt.
- Abhaken, Löschen oder Ergänzen in der Wochenliste verändert die gemeinsame Einkaufsliste nicht.
- Die Wochenliste verwendet denselben Produktkatalog, dieselbe Suche und die Spracheingabe.
- Einmalig muss `weekly_shopping_items.sql` im Supabase SQL Editor ausgeführt werden.

Hinweis: Die vier Personen sind weiterhin App-Profile und keine passwortgeschützten Benutzerkonten. Die App zeigt jeweils nur die Wochenliste des aktuell gewählten Profils an.
