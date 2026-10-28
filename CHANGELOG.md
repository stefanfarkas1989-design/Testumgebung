# Änderungen

Neueste zuerst.

- **Echte Foto-Texturen:** Wände und Böden nutzen jetzt CC0-Fotomaterialien von Poly Haven (Kopfsteinpflaster, Mauerwerk, Fels, Marmor) mit Albedo-, Normalen- und Rauheitskarten (512 px, ca. 1 MB). Sie ersetzen die prozeduralen Texturen, sobald sie geladen sind; fehlen sie, bleibt die prozedurale Grafik. Der Lavaboden bleibt prozedural, damit die Risse leuchten. Quellen und Lizenz: `assets/tex/CREDITS.md`.

- **Fotorealistischere Grafik:** neue PBR-Materialien (prozedural), Umgebungsreflexe, Bloom und Filmfarben, Schatten vom Spielerlicht, feiner modellierter Magier und Skelette mit Detailstufen, Qualitätstest `tests/grafik-qualitaet.js`.

- **Balance (Teil 1):** Simulationsskript `tests/balance-sim.js`; Gegner wachsen schneller mit der Ebene (HP +38 %, Schaden +22 % pro Ebene), Bosse haben doppeltes Leben und +35 % Schaden. Zuvor waren Bosse in unter 20 s besiegt.

- **Händler & Gold:** Funkenkiste (Kaufen, Verkaufen, Verzaubern), Vibration, Einsteiger-Tipps.
- **Story:** Prolog, Briefe, Boss-Dialoge, Chronik, Namenssplitter, Echo-Ebenen, Endkampf, drei Enden.
- **Inventar** neu gestaltet (Symbole, Vergleich, Upgrade-Pfeile, Sortieren).
- **Kamera-Einstellungen** und realistischere 3D-Grafik (Normal-Maps, Schatten, Tone-Mapping).
- **3D-Grafik** mit Three.js, Qualitätsstufen, Leistungsoptimierungen.
- Pause-Menü, Inhalte (Themen, Gegner, Bosse), Skill-Baum, Sound, 2D-Grafik, erster Prototyp.
