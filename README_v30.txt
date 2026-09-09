Familien Einkauf iPhone App – v30

Änderungen gegenüber v29:
- Masseinheit wird bei neuen Listeneinträgen nicht mehr automatisch vorgeschlagen.
- Standardmässig ist das Feld Masseinheit leer.
- Masseinheit ist optional und kann vollständig leer bleiben.
- Die vorhandenen Einheiten stehen weiterhin über die Auswahlliste zur Verfügung.
- Zusätzlich können beliebige eigene Einheiten frei eingetragen werden.
- Alte im Produktkatalog gespeicherte Standard-Masseinheiten werden beim Hinzufügen nicht mehr vorausgewählt.
- Neue Produkte speichern keine vorgeschlagene Standard-Masseinheit mehr.
- In der Produktverwaltung wird keine Standard-Masseinheit mehr angezeigt oder verlangt.
- Wenn weder Menge noch Einheit gesetzt sind, zeigt die Liste einen dezenten Button «Menge», damit die Angaben später ergänzt werden können.

Supabase:
Für diese Änderung ist keine neue SQL-Migration erforderlich. Leere Einheiten werden als leerer Text gespeichert und sind mit dem bisherigen v21/v29-Schema kompatibel.
