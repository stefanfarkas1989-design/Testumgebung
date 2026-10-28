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

- Zufällige Dungeons, pro Ebene ein Boss, danach Treppe zur nächsten Ebene. Alle 2 Ebenen wechselt das Thema: Gruft (Knochenfürst), Kristallhöhle (Spinnenkönigin), Lavakluft (Aschenfürst)
- Magier mit 4 Skills (freigeschaltet bei Level 1 / 2 / 3 / 5)
- Skill-Baum (Taste `K` / 📜-Button): pro Level 1 Punkt, pro Skill 5 Knoten mit Modifikatoren (z. B. Feuerball teilt sich, Nova friert ein, Blitz mit Donnerschlag, Teleport mit Phasenschock) plus Passiv-Baum, Respec kostenlos
- Loot mit Seltenheiten (Normal, Magisch, Selten, Legendär), zufälligen Affixen und 6 Ausrüstungsplätzen
- 9 Gegnertypen mit eigenem Verhalten (Dash, Giftspucke, Feuerfächer, Bodenschläge mit Warnkreis), Bossmuster (Giftwolken, Meteore, Brut-Beschwörung), Champions mit Eigenschaften (Flink, Explosiv, Brennend)
- Gefahrenzonen am Boden, zerstörbare Fässer/Urnen/Geoden mit Beute, Säulen als Hindernisse
- Legendäre Items mit Spezialkräften (Lebensraub, Brand, Explosion, Dornen, Mana/Tempo bei Kill, Frost-Aura)
- Champion-Gegner, Heiltränke, Level-Ups, Autosave (localStorage)
- Synthetisierter Sound (WebAudio, Hall, 3D-Positionierung) und Kampf-Feedback: Trefferpause, Betäubung, Rückstoß, Kamerawackeln, Herzschlag bei wenig Leben (🔊-Button schaltet stumm)
- Prozedurale Grafik ohne Bilddateien: Stein-Texturen, dynamisches Licht (Fackeln, Feuerball, Blitz), animierte Figuren, Blut- und Knochenspuren

## Code-Struktur

- `js/audio.js` – Sounds und Ambiente
- `js/data.js` – Items, Affixe, Drops, Skills, Gegner-Definitionen
- `js/dungeon.js` – Dungeon-Generator und Wegfindung (BFS)
- `js/game.js` – Spiellogik, Kampf, KI
- `js/art.js` – Texturen, Licht-Sprites, gezeichnete Figuren
- `js/render.js` – Szene, Lichtkarte, Effekte
- `js/ui.js` – HUD, Minimap, Inventar
- `js/input.js` – Tastatur, Maus, Touch
