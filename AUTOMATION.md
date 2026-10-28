# Anleitung für automatische Entwicklungsläufe

Dieses Dokument richtet sich an die automatischen Claude-Läufe, die „Aschenfall“ regelmäßig weiterentwickeln. Der Besitzer prüft jeden Lauf als **Pull Request** und gibt ihn frei oder lehnt ihn ab.

## Ablauf

1. **Repo bereitstellen:** `stefanfarkas1989-design/Testumgebung` muss im Arbeitsverzeichnis liegen (sonst mit `add_repo` hinzufügen und klonen). GitHub-Zugriff läuft über die `mcp__github__*`-Werkzeuge (per ToolSearch laden). Es gibt kein `gh`.
2. **Zuerst Rückmeldungen prüfen:** Offene Pull Requests mit Titel `[Auto] …` auflisten.
   - Gibt es Review-Kommentare oder fehlschlagende Prüfungen: auf **diesen** PRs (auf deren Branch) umsetzen und pushen. Das hat Vorrang vor neuer Arbeit.
   - Sind bereits **2 oder mehr** offene `[Auto]`-PRs ohne neue Rückmeldung vorhanden: **nichts Neues beginnen**, Lauf mit kurzer Notiz beenden.
3. **Einen Punkt wählen:** den obersten offenen Punkt aus `ROADMAP.md`, der in einem Lauf machbar ist. Große Punkte in Teilschritte zerlegen und nur den ersten umsetzen (Rest in der Roadmap ergänzen).
4. **Umsetzen**, klein und fokussiert. Danach:
   - `sh tests/run-all.sh` ausführen. Alles muss bestehen. Für neue Funktionen einen passenden Test in `tests/` ergänzen.
   - `./bump.sh` ausführen (Versionsnummer gegen veraltete Caches).
   - `README.md` aktualisieren, Roadmap-Punkt abhaken, Eintrag in `CHANGELOG.md` ergänzen.
5. **Auf dem eigenen Arbeitsbranch pushen** (nie auf den Standard-Branch) und einen **Pull Request** gegen den Standard-Branch öffnen.
   - Titel: `[Auto] <kurze Beschreibung>`. Beschreibung auf Deutsch: Was wurde gebaut, warum, wie getestet, was der Besitzer beim Ausprobieren auf dem Handy beachten soll, bekannte Einschränkungen.
   - PR-Vorlage des Repos beachten, falls vorhanden.

## Regeln

- **Nie** direkt auf den Standard-Branch pushen, keine Force-Pushes, keine Änderungen an Repo-/Pages-Einstellungen.
- Kein neues Laufzeit-Netzwerk (keine CDN-Skripte, keine externen Bilder/Schriften). Bibliotheken liegen in `lib/`.
- Mobile zuerst: Touch-Bedienung muss funktionieren, Leistung im Blick behalten (Zeichenaufrufe unter ca. 100, Qualitätsstufen respektieren). Die 2D-Notlösung darf nicht abstürzen.
- Spielstände dürfen nicht kaputtgehen: `loadGame` bleibt tolerant gegenüber alten Speicherständen.
- Texte im Spiel sind Deutsch. Der Ton der Geschichte (siehe `STORY.md`) bleibt erhalten.
- Keine Geheimnisse, keine Zugangsdaten in Dateien oder PRs.
- Am Ende des Laufs kurz zusammenfassen: was gebaut, Testergebnis, PR-Link.

## Hilfen

- **Tests:** `sh tests/run-all.sh` (ca. 2–3 Minuten, benötigt Node, Playwright und Chromium, Software-WebGL).
- **Lokal ansehen:** `python3 -m http.server 8123`, dann `http://localhost:8123`.
- **Architektur:** siehe README („Code-Struktur“). Spiellogik in `js/game.js`, 3D in `js/render3d.js` und `js/models3d.js`, UI in `js/ui.js`, Story in `js/story.js`, Daten in `js/data.js`.
- **Screenshots:** Mit Playwright aufnehmen und beschreiben (Bilder lassen sich nicht in PRs anhängen).
