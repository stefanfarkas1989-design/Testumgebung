# Möbel-Generator

Browser-Konfigurator für Plattenmöbel (Start: Regal). Ablauf: Möbel planen → Teile bei Frischeis
fertig zuschneiden und bekanten lassen (JAF-Zuschnittformular für WebCut) → Bohren/Fräsen selbst.

Starten: im Repo-Ordner `python3 -m http.server 8000`, dann `http://localhost:8000/moebel/` öffnen.

## Was der Generator liefert
- Stückliste (Länge = Maserrichtung, Fertigmaß inkl. Kante, ganze mm abgerundet)
- Zuschnittplan je Rohplattenformat (nur zur Orientierung, Frischeis schneidet selbst)
- Materialübersicht ohne Preise (Preise in WebCut)
- JAF-Zuschnittformular v4.3 (`vorlagen/`), ausgefüllt mit Platte, Kante, Rückwand
- Teilezeichnungen (SVG): Fertigmaß, Kantenlage, Lage aller anschließenden Teile ab Nullpunkt, Spiegelteile
- Frischeis-Kataloge (öffentliche Shopdaten, ohne Preise): dekorative Platten, Kanten, dünne Platten für Rückwände

## Offene Annahmen (bitte prüfen)
- **Kantenspalten im JAF-Formular:** V/H = Kanten entlang der Länge (V = vorne), L/R = Kanten an den Enden.
  Abgeleitet aus der Legende im Formular, nicht von Frischeis bestätigt.
- **Farbe in 3D:** aus dem Dekornamen geschätzt.
- **Konstruktion Regal:** Seiten durchgehend, Boden/Deckel/Fachböden dazwischen, Sockelblende 30 mm hinter
  der Vorderkante. Das sind Konstruktionsentscheidungen, keine Normwerte.
- **Rückwand in Nut (Standard, Vorgaben vom Nutzer):** Nut in Seiten, Boden und Deckel, 10 mm ab Hinterkante,
  8 mm tief, Breite = Rückwandstärke; Rückwand 1 mm Luft am Nutgrund (greift 7 mm ein); Seitennut gestoppt auf
  Höhe der Nutgründe in Boden/Deckel; Nut in Boden/Deckel durchgehend. Fachböden und Mittelteiler enden an der
  Rückwand (Tiefe − Nutabstand − Rückwandstärke). Alles im Generator änderbar.
  Hinweis: Eine gefräste Nut hat an ihren Enden den Radius des Fräsers.
- **Rückwand aufgesetzt (Alternative):** Rückwandmaß = Breite − 2 mm, Höhe − Sockel − 2 mm (Konstruktionsentscheidung).
- **Verbinder (Vorgaben vom Nutzer):** Konfirmat + Dübel abwechselnd im 64er-Raster, vorne beginnend mit
  Konfirmat, Randabstand 50 mm. Dübel Ø8 × 30 (Frischeis 69010/0008), Bohrtiefe Fläche 13 / Stirn 19 mm.
  Konfirmat 7 × 50: Durchgang Ø7 in der Fläche, Kernloch Ø5 × 36 mm in der Stirnseite.
  Fachböden am Mittelteiler nur gedübelt, rechte Seite um 32 mm versetzt (sonst Kollision).
  Quellen Konfirmat: Händlerangaben zu Häfele Confirmat 7 × 50 (Kernloch Ø5), Fachartikel Holz & Leim
  (Durchgang Ø7, Stirn Ø5). **Senkung Ø10 nicht aus einem Häfele-Datenblatt geprüft.**
- **Maschine bohrt nur von oben:** Flächenbohrungen per CNC, Kantenbohrungen (Kernlöcher, Dübel in der Stirn)
  von Hand mit Bohrlehre. Konfirmat-Köpfe liegen außen auf Seitenwänden (Blende), Deckel-Oberseite und
  Boden-Oberseite (Sockelblende) – bitte prüfen, ob dort sichtbar.

## Möbeltypen, Sockel (Vorgaben vom Nutzer, Maße mit * im Generator = bitte prüfen)
- **Füße:** Hettich Sockel-Verstellfuß-Set, 4 Stück aus Kunststoff, höhenverstellbar 100–120 mm, max. 200 kg,
  inkl. Klips für Frontblenden, EAN 4008057011990 (Produktbeschreibung vom Nutzer). Ø25 laut Produktname.
  Hettich-DIY-Shop: Sockelverstellfuß-Set 100–120 × Ø25 mm, Kunststoff schwarz, Art.-Nr. 9149109
  (Einzelfuß 9149088). Händler (der-technikprofi.de) nennt GTIN 4008057017015 für ein gleich beschriebenes Set.
  Schraubbild/Montage fehlt in allen Quellen; ob 200 kg je Set oder je Fuß gilt, ist offen.
  Alternative **QWORK** (Amazon, 20 Stück mit Sockelclips und Verbindungsplatten): Verstellbereich 100–120 mm
  laut Titel (Zeichnung im Angebot zeigt 100–140 mm – ungeprüft), Grundplatte 70 mm, Kopf Ø46, Clip für Ø25,
  Verbindungsplatte 50 × 30 mit 2 Löchern (Lochabstand nicht bemaßt). Schraubbild fehlt. Korpus steht auf Füßen, Seiten enden bündig mit dem Boden.
  Füße je Senkrechte vorne und hinten, Randabstand 50 mm*. Sockelblende volle Breite, 30 mm* zurück, geklipst.
- **Schrank:** Deckenblende zurückversetzt (5 mm*), Höhe = Raumhöhe (2500*) − Schrankhöhe − Luft (5 mm*),
  von innen durch den Deckel mit Konfirmat/Dübel verbunden.
- **Sideboard:** Arbeitsplatte oben drauf, nur vorne Überstand (20 mm*), seitlich/hinten bündig,
  Kanten vorne + Stirnseiten (Kantenart B im JAF-Formular). Eigenes Dekor möglich (eigene Zuschnittgruppe).
  Von innen mit Spax 4 × 35 durch den Deckel verschraubt: Durchgang Ø5 im Deckel, keine Vorbohrung in der
  Arbeitsplatte, pro Fach 4 Stück (2 vorne, 2 hinten), 50 mm* von Vorder-/Hinterkante und von den Senkrechten.
  Prüfung: Spax-Länge − Deckelstärke muss kleiner als die Arbeitsplattenstärke sein.
  Auswahl: Frischeis-Laminat-Arbeitsplatten (372 Artikel, 38 und 20 mm, 4100 × 600–1200) zuerst, dann Dekorplatten.
  Viele heißen „Arbeitsplatte mit Kante MOD 100/1,5“ bzw. „Postforming“ – ob/wo ab Werk bekantet ist, bitte
  im Shop prüfen; der Generator setzt Kantenart B vorne und an den Stirnseiten.
- **Darstellung:** Holzmaserung im 3D-Modell ist erzeugt (kein Foto), läuft je Teil in Maserrichtung.

## Türen (Vorgaben vom Nutzer, Hettich-Daten)
- Pro Spalte wählbar: offen, Drehtür Band links/rechts, 2 Drehtüren, Schiebetüren. Fronten mit eigenem Dekor
  und eigener Kante (Kantenart C im JAF-Formular), rundum bekantet, Maserung senkrecht.
- **Drehtüren aufliegend**, Fuge 3 mm: außen bündig mit der Seitenwand, am Mittelteiler bis zur Mitte.
  Hettich Sensys: Topf Ø35, Mindestbohrtiefe 12,9 mm, Türstärke 15–24 mm (Shop-/Händlerdaten), Topfabstand K = 5
  (Nutzer, Bereich 3–7). Kreuzmontageplatte Lochreihe 37 × 32, Euroschrauben Ø5 × 12, Distanz 0 (Hettich-Shop).
  Bänder: 2 bis 1000 mm Türhöhe, 3 bis 1800, darüber 4, je 100 mm von Ober-/Unterkante (Nutzer).
  An Seitenwänden vorliegend, am Mittelteiler Mittelwandanschlag. Schraublöcher im Topf (TH 52) noch nicht gesetzt.
- **Schiebetüren Hettich SlideLine M einliegend**, 2-bahniges Profil (Katalog „SlideLine M“, Hettich 2017):
  Türgewicht ≤ 30 kg, Breite 300–1800, Höhe ≤ 2000 und ≤ 2 × Breite (Text). Aus der Montagezeichnung abgelesen
  (bitte prüfen): Profil 12 mm hoch oben und unten, oben 3 mm Luft → Türhöhe = lichte Höhe − 27; vordere Tür 1 mm
  hinter Vorderkante, Spurabstand 32 (19 + 13), dahinter ≥ 7 mm → Fachböden 59 mm zurück; seitlich 1 mm;
  Beschlag-Schraubpositionen 11,5 mm vom Türrand, oben ab 27 mm, unten ab 11,5 mm, Raster 32 (nur markiert,
  Bohrdurchmesser je nach Schraube). Türstärke laut Zeichnung ≤ 20 mm. Überlappung 30 mm (Nutzer).
- Griffe: noch offen.

## Kataloge aktualisieren
```
python3 tools/frischeis_katalog.py dekor /tmp/dekor.json && python3 tools/frischeis_kompakt.py /tmp/dekor.json moebel/frischeis-dekor.json
python3 tools/frischeis_katalog.py kante /tmp/kante.json && python3 tools/frischeis_kompakt.py /tmp/kante.json moebel/frischeis-kanten.json
python3 tools/frischeis_katalog.py rueckwand /tmp/rw.json && python3 tools/frischeis_kompakt.py /tmp/rw.json moebel/frischeis-rueckwand.json
python3 tools/frischeis_katalog.py arbeitsplatte /tmp/ap.json && python3 tools/frischeis_kompakt.py /tmp/ap.json moebel/frischeis-arbeitsplatte.json
```

## Tests
`node tests/moebel-logik.js`, `tests/moebel-jaf.js` (braucht jszip), Browser-Tests `tests/moebel-*-ui.js` (Server auf Port 8123).
