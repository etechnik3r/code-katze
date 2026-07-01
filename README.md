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

Das Ziel ist nicht immer ein Fisch – es gibt auch andere Dinge, die Katzen
mögen (🥛 Milch, 🐭 Maus, 🧶 Wollknäuel, 🐦 Vogel, 🦋 Schmetterling …).

## Steuerung

| Button | Bedeutung |
| ------ | --------- |
| ⬆️ Schritt | Einen Schritt in Blickrichtung vorwärts |
| ↺ Links | Die Katze nach links drehen (gegen den Uhrzeigersinn) |
| ↻ Rechts | Die Katze nach rechts drehen (im Uhrzeigersinn) |
| ▶︎ Start | Die Warteschlange ausführen |
| 🧹 Löschen | Die gesamte Warteschlange leeren |

## Profi-Modus (Schleifen & Logik)

Im ⚙️-Menü lässt sich der **Profi-Modus** einschalten. Dann erscheinen
zusätzliche Bausteine, die mit Klammern arbeiten – ein Öffner `(` und der
Schließer `)`. Alles zwischen den Klammern gehört zusammen und darf auch
verschachtelt werden:

| Baustein | Bedeutung |
| -------- | --------- |
| 🔁 2× ( … ) | Wiederholt den Inhalt **zweimal** |
| 🔁 3× ( … ) | Wiederholt den Inhalt **dreimal** |
| 🎯 bis Ziel ( … ) | Wiederholt den Inhalt, **bis das Ziel erreicht** ist |
| ❓ wenn frei ( … ) | Führt den Inhalt nur aus, **wenn das Feld vor der Katze frei** ist |
| ) Ende | Schließt die zuletzt geöffnete Klammer |

So üben Kinder die zentralen Programmier-Konzepte **Schleife** und
**Bedingung**. Fehlende oder überzählige Klammern werden vor dem Start
freundlich gemeldet.

Ein Tipp auf einen bereits gelegten Befehlsblock **löscht** diesen wieder.
Die Warteschlange bricht bei vielen Befehlen **mehrzeilig** um, damit das
ganze „Programm" auf einen Blick sichtbar bleibt.

## Nachvollziehen & Debuggen

- Der **gelaufene Weg** wird als gepunktete Linie eingezeichnet; an den
  Stellen, wo die Katze abgebogen ist, erscheinen kleine Dreh-Symbole
  (↺ / ↻). So kann man in Ruhe nachvollziehen, wie die Katze gelaufen ist.
- Nach einem Fehlversuch geht die Katze zurück auf Start – die
  Warteschlange **bleibt erhalten**, damit man den Fehler suchen und
  korrigieren kann. Unendlich viele Versuche.

## Einstellungen (⚙️ oben rechts)

- **Schwierigkeit** in drei Farben für verschiedene Altersstufen:
  Leicht (grün, ab ~5 J.), Mittel (orange, ab ~7 J.), Schwer (rot, ab ~9 J.).
- **Gelaufene Spur** ein-/ausblenden.
- **Symbol-Legende**, die alle vorkommenden Symbole erklärt.

Die gewählten Einstellungen werden im Browser gespeichert (localStorage).

## Die Katze

Die Katze ist bewusst **nicht** als Emoji-Gesicht umgesetzt, sondern aus
reinen CSS-Formen gebaut (Kopf, Ohren, Augen und eine nach vorne zeigende
Nase). So ist immer klar erkennbar, in welche Richtung sie schaut – und
die Drehungen sind gut sichtbar.

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

Im Objekt `SCHWIERIGKEITEN` (oben in `game.js`) bei der passenden Stufe
(`leicht` / `mittel` / `schwer`) einfach einen neuen Eintrag an die
`levels`-Liste anhängen. Eine Karte besteht aus Textzeilen mit je einem
Zeichen pro Feld:

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
