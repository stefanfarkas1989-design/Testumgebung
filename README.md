# Aschenfall

Ein kleines Action-RPG (Diablo-/Path-of-Exile-Stil) für Handy und Browser. Reines HTML5-Canvas + JavaScript, keine Abhängigkeiten.

## Starten

```bash
python3 -m http.server 8000
# dann http://localhost:8000 im Browser öffnen (Handy: IP des Rechners verwenden)
```

## Steuerung

| | PC | Handy |
|---|---|---|
| Laufen | WASD / Pfeiltasten | links wischen (virtueller Joystick) |
| Feuerball | Linksklick halten / `1` | großer Button rechts unten (Auto-Zielen) |
| Frostnova / Kettenblitz / Teleport | `2` / `3` / `4` | Buttons im Bogen |
| Heiltrank | `Q` | 🧪-Button |
| Inventar | `I` / `Tab` | 🎒-Button |

## Inhalt

- Zufällige Dungeons, pro Ebene ein Boss ("Knochenfürst"), danach Treppe zur nächsten Ebene
- Magier mit 4 Skills (freigeschaltet bei Level 1 / 2 / 3 / 5)
- Loot mit Seltenheiten (Normal, Magisch, Selten, Legendär), zufälligen Affixen und 6 Ausrüstungsplätzen
- Champion-Gegner, Heiltränke, Level-Ups, Autosave (localStorage)

## Code-Struktur

- `js/data.js` – Items, Affixe, Drops, Skills, Gegner-Definitionen
- `js/dungeon.js` – Dungeon-Generator und Wegfindung (BFS)
- `js/game.js` – Spiellogik, Kampf, KI, Rendering
- `js/ui.js` – HUD, Minimap, Inventar
- `js/input.js` – Tastatur, Maus, Touch
