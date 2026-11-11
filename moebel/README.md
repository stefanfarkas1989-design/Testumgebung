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
  Schraubbild/Montage fehlt in allen Quellen; ob 200 kg je Set oder je Fuß gilt, ist offen. Korpus steht auf Füßen, Seiten enden bündig mit dem Boden.
  Füße je Senkrechte vorne und hinten, Randabstand 50 mm*. Sockelblende volle Breite, 30 mm* zurück, geklipst.
- **Schrank:** Deckenblende zurückversetzt (5 mm*), Höhe = Raumhöhe (2500*) − Schrankhöhe − Luft (5 mm*),
  von innen durch den Deckel mit Konfirmat/Dübel verbunden.
- **Sideboard:** Arbeitsplatte oben drauf, nur vorne Überstand (20 mm*), seitlich/hinten bündig,
  Kanten vorne + Stirnseiten; Verschraubung von unten noch offen.
- **Darstellung:** Holzmaserung im 3D-Modell ist erzeugt (kein Foto), läuft je Teil in Maserrichtung.

## Kataloge aktualisieren
```
python3 tools/frischeis_katalog.py dekor /tmp/dekor.json && python3 tools/frischeis_kompakt.py /tmp/dekor.json moebel/frischeis-dekor.json
python3 tools/frischeis_katalog.py kante /tmp/kante.json && python3 tools/frischeis_kompakt.py /tmp/kante.json moebel/frischeis-kanten.json
python3 tools/frischeis_katalog.py rueckwand /tmp/rw.json && python3 tools/frischeis_kompakt.py /tmp/rw.json moebel/frischeis-rueckwand.json
```

## Tests
`node tests/moebel-logik.js`, `tests/moebel-jaf.js` (braucht jszip), Browser-Tests `tests/moebel-*-ui.js` (Server auf Port 8123).
