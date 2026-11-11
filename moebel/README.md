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
- **Bohrungen/Verbinder:** noch keine. Maschine bohrt nur von oben (keine Kantenbohrungen).

## Kataloge aktualisieren
```
python3 tools/frischeis_katalog.py dekor /tmp/dekor.json && python3 tools/frischeis_kompakt.py /tmp/dekor.json moebel/frischeis-dekor.json
python3 tools/frischeis_katalog.py kante /tmp/kante.json && python3 tools/frischeis_kompakt.py /tmp/kante.json moebel/frischeis-kanten.json
python3 tools/frischeis_katalog.py rueckwand /tmp/rw.json && python3 tools/frischeis_kompakt.py /tmp/rw.json moebel/frischeis-rueckwand.json
```

## Tests
`node tests/moebel-logik.js`, `tests/moebel-jaf.js` (braucht jszip), Browser-Tests `tests/moebel-*-ui.js` (Server auf Port 8123).
