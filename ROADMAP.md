# Roadmap

Die automatischen Entwicklungsläufe (siehe `AUTOMATION.md`) arbeiten diese Liste von oben nach unten ab: **ein Punkt pro Lauf, ein Pull Request pro Punkt.** Erledigtes wird mit `[x]` markiert, neue Ideen dürfen unten ergänzt werden.

## Spielgefühl & Balance
- [ ] **Balance-Pass:** Simulationsskript (in `tests/`), das pro Ebene Schadensdurchsatz des Spielers und Gegnerschaden misst. Skalierung von Gegner-HP/-Schaden, Boss-Werten (besonders Ebene 9, Das Schweigen), Loot-Qualität und Gold-Preisen so anpassen, dass Ebene 1–9 in etwa 1,5–2,5 Stunden Spielzeit machbar sind und Tode selten, aber möglich sind.
- [ ] **Schwierigkeitsgrade** (Normal / Schwer / Albtraum) mit besserem Loot, wählbar beim neuen Spiel.
- [ ] **Todes-Zusammenfassung:** Nach dem Tod kurze Anzeige (Ebene, besiegte Gegner, gesammeltes Gold/Namen).
- [ ] **Zielhilfe verbessern** (Touch): bevorzugt Gegner in Bewegungsrichtung, Elite/Boss priorisieren; optionale Anzeige des Ziels.

## Inhalt
- [ ] **Schreine** in Räumen (Buffs für 60 s: Schaden, Tempo, Regeneration, Glück bei Beute), mit Hinweis im Chronik-Bestiarium.
- [ ] **Schatzgoblin** (selten, flieht, lässt viel Gold und Items fallen).
- [ ] **Neue Skills** im Skill-Baum: z. B. Eisschild (Absorption), Meteor (Flächenschaden mit Warnkreis), Arkane Kugel (ziehende Projektile). Jeweils mit Knoten, Sound, 3D-Effekt.
- [ ] **Item-Sets der Glutwacht** (3er-Sets mit Bonus) und **Sockel-Edelsteine** (Gold-Senke).
- [ ] **Zweite Klasse** (z. B. Wächter im Nahkampf) mit eigenem Modell, Skills und Skill-Baum. Mehrere PRs, zuerst nur Modell + Klassenwahl.
- [ ] **Mehr Gegner-Varianten** pro Welt und seltene „Jäger“-Champions mit Eigenschaften.

## Grafik & Sound
- [ ] **Feinere 3D-Modelle** für Magier und Bosse (mehr Details, bessere Proportionen, Animationen).
- [ ] **Modell-Pool** für Gegner (Wiederverwenden statt neu bauen), um Ruckler beim Betreten großer Räume zu vermeiden.
- [ ] **Musik:** generierte Hintergrundmusik pro Welt und Bossmusik (WebAudio, ohne Dateien), mit Lautstärke-Regler für Musik und Effekte.
- [ ] **Wasser/Lava-Reflexionen**, Nebelschwaden, Lichtstrahlen (günstig, nur bei Qualität Hoch/Mittel).

## Bedienung & Zugänglichkeit
- [ ] **Linkshänder-Modus** und verschiebbare Skill-Buttons.
- [ ] **Schriftgröße** und **farbenblind-freundliche Seltenheitsmarker** (Symbole zusätzlich zu Farben).
- [ ] **PWA:** installierbar (Manifest, App-Symbole) mit Offline-Cache. Der Service-Worker muss versioniert sein, damit Updates sofort ankommen (`bump.sh`).
- [ ] **Englisch** als zweite Sprache (Textquellen in `story.js`, `ui.js`, `data.js` auslagern).

## Technik
- [ ] **`game.js` aufteilen** (Kampf, KI, Gefahren, Inventar-Aktionen) ohne Verhaltensänderung, Tests grün halten.
- [ ] **Speicherstand-Versionierung** und Migrationen.
- [ ] **Leistungsmessung:** Frame-Zeit-Overlay (Debug), Budget-Test für Zeichenaufrufe und Dreiecke in `tests/`.
- [ ] **Unit-Tests** für Item-Generierung, Skill-Baum-Effekte und Preisberechnung.
