# Möbel-Generator

Browser-Konfigurator für Plattenmöbel (Start: Regal). Maße, Fachböden, Mittelteiler, Sockel und Material einstellen, live in 3D ansehen und bekommen:
Stückliste (CSV-Export), Zuschnittplan pro Rohplatte, Material- und Kostenschätzung, Beschlagliste, Bauanleitung.

Starten: im Repo-Ordner `python3 -m http.server 8000`, dann `http://localhost:8000/moebel/` öffnen.

Tests: `node tests/moebel-logik.js` (Logik), `tests/moebel-ui.js` (Browser, Server auf Port 8123).

Ideen für später: Schrank mit Türen/Schubladen, Tisch, Raumplaner mit Grundriss, Export für Zuschnitt-Dienste, Massivholz-Verbindungen.
