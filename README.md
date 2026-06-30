# 🐱 Code-Katze

> **JonFie Studios präsentiert:** ein pädagogisches, Mobile-First Browserspiel,
> mit dem Kinder spielerisch **algorithmisches Denken** (Pre-Coding) üben.

## Idee

Die Code-Katze 🐱 soll zu ihrem Fisch 🐟 gesteuert werden. Aber Achtung: Das
Kind steuert die Katze **nicht direkt**. Stattdessen legt es zuerst eine Folge
von Befehlen in eine **Warteschlange** und lässt diese danach Schritt für
Schritt ausführen – genau wie ein kleines Computerprogramm.

Auf dem Weg lauern Hindernisse wie Wasserpfützen 💧 und Hunde 🐶. Läuft die
Katze dagegen (oder gegen die Wand), schlägt der Versuch fehl. Das ist nicht
schlimm: **Die Warteschlange bleibt erhalten**, damit das Kind seinen Code in
Ruhe prüfen, den Fehler suchen („debuggen“) und verbessern kann. Es gibt
unendlich viele Versuche.

## Steuerung

| Button | Bedeutung |
| ------ | --------- |
| ⬆️ Schritt | Einen Schritt in Blickrichtung vorwärts |
| ↩️ Links | Die Katze nach links drehen |
| ↪️ Rechts | Die Katze nach rechts drehen |
| ▶︎ Start | Die Warteschlange ausführen |
| 🧹 Löschen | Die gesamte Warteschlange leeren |

Ein Tipp auf einen bereits gelegten Befehlsblock **löscht** diesen wieder.

## Starten

Keine Installation nötig. Einfach `index.html` im Browser öffnen –
am besten auf einem Smartphone im Hochformat.

## Aufbau / Technik

Bewusst einfach gehalten, leicht erweiterbar:

```
index.html   – Struktur (Header, Spielfeld, Buttons, Queue, Overlay)
style.css    – Mobile-First Design (nur Emojis & CSS-Formen, keine Bilder)
game.js      – Spiel-Logik (Vanilla JavaScript, ausführlich kommentiert)
```

### Neue Level hinzufügen

Im Array `LEVELS` (oben in `game.js`) einfach einen neuen Eintrag anhängen.
Eine Karte besteht aus Textzeilen mit je einem Zeichen pro Feld:

```
.  = freies Feld
K  = Katze (Startposition)
F  = Fisch (Ziel)
W  = Wasserpfütze (Hindernis)
H  = Hund (Hindernis)
```

`blick` legt die Startblickrichtung fest: `0` = oben, `1` = rechts,
`2` = unten, `3` = links.

---

© JonFie Studios
