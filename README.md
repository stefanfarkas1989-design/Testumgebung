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
| Pause | `P` / `Esc` | ⏸-Button (pausiert auch automatisch beim App-Wechsel) |

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
- **3D-Grafik** (Three.js, in `lib/` mitgeliefert): perspektivische Kamera, 3D-Wände und -Figuren aus Low-Poly-Formen, dynamisches Licht mit Fackeln, Glüh-Effekte, Partikel. Realistischere Optik durch Relief (Normal-Maps), weiche Schatten (Qualität „Hoch“), Filmfarben, Wandgesimse und Fackelfunken. Die Kamera lässt sich im Pause-Menü (Zoom, Neigung) und mit dem Mausrad einstellen. Im Pause-Menü lässt sich auf 2D umschalten und die Qualität wählen (Auto passt sich der Leistung des Geräts an)
- Prozedurale Grafik ohne Bilddateien: Stein-Texturen, dynamisches Licht (Fackeln, Feuerball, Blitz), animierte Figuren, Blut- und Knochenspuren

## Code-Struktur

- `js/audio.js` – Sounds und Ambiente
- `js/data.js` – Items, Affixe, Drops, Skills, Gegner-Definitionen
- `js/dungeon.js` – Dungeon-Generator und Wegfindung (BFS)
- `js/game.js` – Spiellogik, Kampf, KI
- `js/art.js` – Texturen, Licht-Sprites, gezeichnete Figuren
- `js/render.js` – 2D-Renderer (Notlösung)
- `js/render3d.js` – 3D-Renderer (Level-Geometrie, Licht-Pool, Effekte)
- `js/models3d.js` – 3D-Figuren
- `lib/three.min.js` – Three.js r158 (MIT-Lizenz, siehe `lib/three.LICENSE`)
- `js/ui.js` – HUD, Minimap, Inventar
- `js/input.js` – Tastatur, Maus, Touch
