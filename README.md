# 🐱 Code-Katze

> **JONFIE STUDIOS präsentiert:** ein pädagogisches, Mobile-First Browserspiel,
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
| ↰ Links | Die Katze eine Vierteldrehung nach links |
| ↱ Rechts | Die Katze eine Vierteldrehung nach rechts |
| ▶︎ Start | Die Warteschlange ausführen |
| ⏹ Stopp | Während des Laufs wird der Start-Button zum Stopp-Button – das Programm hält sofort an (wichtig bei langen Schleifen) |
| 🐾 1 Schritt | Einzelschritt-Modus: führt nur den **nächsten** Befehl aus und pausiert dann – ein kleiner „Debugger" zum Nachvollziehen |
| 🧹 Löschen | Die gesamte Warteschlange leeren |

Am Desktop geht alles auch per **Tastatur**: Pfeiltasten = Befehle,
Enter = Start, Backspace = letzten Block löschen, Escape = Stopp/Fenster zu.

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
| ➰ solange frei ( … ) | Wiederholt den Inhalt, **solange das Feld voraus frei** ist (While-Schleife) |
| ❓ wenn frei ( … ) | Führt den Inhalt nur aus, **wenn das Feld voraus frei** ist |
| 🧱 wenn Wand ( … ) | Führt den Inhalt nur aus, **wenn voraus eine Wand/ein Hindernis** ist |
| ) Ende | Schließt die zuletzt geöffnete Klammer |

So üben Kinder die zentralen Programmier-Konzepte **Schleife** (zählend,
kopfgesteuert, „bis Ziel") und **Bedingung**. Blöcke lassen sich
verschachteln; fehlende oder überzählige Klammern **und leere Blöcke**
werden vor dem Start freundlich gemeldet (und kosten keinen 💡-Versuch).

## Level & Fortschritt

Es gibt **20 Level pro Schwierigkeit** (60 insgesamt), alle per Breitensuche
auf Lösbarkeit geprüft und **innerhalb jeder Stufe aufsteigend nach der
Länge der kürzesten Lösung sortiert** – die Schwierigkeit steigt also
wirklich Schritt für Schritt. Nach dem letzten Level einer Stufe geht es
**automatisch eine Stufe höher** (leicht → mittel → schwer). Nach „schwer"
bleibt es bei „schwer" – es wird nie selbstständig auf eine leichtere Stufe
zurückgeschaltet.

Der **Fortschritt wird pro Stufe gespeichert** (localStorage): Beim
nächsten Öffnen geht es genau da weiter, wo man aufgehört hat – und auch
ein Wechsel der Schwierigkeit kostet keinen Fortschritt mehr. Ein Tipp auf
die **Level-Anzeige oben links** („Leicht · 3/20") öffnet die
**Level-Auswahl** mit **Stufen-Tabs** (Leicht/Mittel/Schwer): alle Level
als Knöpfe, gelöste zeigen ihre besten Sterne und 💡.

Beim allerersten Start erklärt ein kurzes Hallo-Fenster das Spiel, danach
führt eine **interaktive Coach-Sprechblase** durch das erste Level
(„Tippe Befehle" → „Drücke ▶ Start") – die passenden Knöpfe pulsieren dabei.

## Bewertung (zwei Reihen)

Nach jedem gelösten Level gibt es zwei Bewertungen mit je **1–3 Symbolen**:

- **⭐ Sterne – cleverer Code:** Das Spiel kennt die theoretisch kürzeste
  Lösung (sicher per Breitensuche berechnet) und vergleicht sie mit der
  Anzahl deiner Bausteine. Wer eine **Schleife** benutzt, bekommt zusätzlich
  einen **🔁 Schleifen-Bonus-Stern** – so lohnt sich echtes Programmieren
  auch dann, wenn die Klammern zwei Bausteine „Overhead" kosten.
- **💡 Glühbirnen – gleich richtig gedacht:** Beim **1. Versuch** gelöst gibt
  die volle Punktzahl; je mehr Versuche, desto weniger. Der Versuchszähler
  wird **pro Level gespeichert** – kurz in ein anderes Level wechseln setzt
  ihn nicht zurück.

Ist noch Luft nach oben, erscheint ein **„Nochmal"**-Button: Das Level
startet dann **komplett frisch** (Programm weg, Versuchszähler auf 0), damit
man es wirklich noch einmal neu und diesmal gleich richtig probiert.

## Sichtbares Feedback

Läuft etwas schief, zeigt das Spielbrett direkt **wo**: ein 💥 auf dem Feld,
gegen das die Katze gestoßen ist, bzw. ein ❓, wenn das Ziel nicht erreicht
wurde – nicht nur als Text. Nach einem Moment **schrumpft der Marker in die
Ecke**, damit das Hindernis darunter wieder sichtbar ist. Die gelaufene
Spur mit Dreh-Symbolen (↰ / ↱) hilft beim Nachvollziehen; mehrere Drehungen
auf demselben Feld werden **versetzt gestapelt** und liegen über der Katze.
Beim Sieg gibt es erst eine kleine **Konfetti-Feier direkt am Zielfeld**,
bevor das Ergebnis-Fenster erscheint.

Das **×-Kreuz** an einem Befehlsblock **löscht** diesen wieder. Ein Tipp
auf den **Block selbst** setzt eine **Einfügemarke**: Neue Befehle landen
dann davor – so lässt sich ein vergessener Befehl mitten im Programm
ergänzen. Die Warteschlange bricht bei vielen Befehlen **mehrzeilig** um,
damit das ganze „Programm" auf einen Blick sichtbar bleibt.

## Nachvollziehen & Debuggen

- Der **gelaufene Weg** wird als gepunktete Linie eingezeichnet; an den
  Stellen, wo die Katze abgebogen ist, erscheinen kleine Dreh-Symbole
  (↰ / ↱). So kann man in Ruhe nachvollziehen, wie die Katze gelaufen ist.
- Nach einem Fehlversuch geht die Katze zurück auf Start – die
  Warteschlange **bleibt erhalten**, damit man den Fehler suchen und
  korrigieren kann. Unendlich viele Versuche.

## Einstellungen (⚙️ oben rechts)

- **Schwierigkeit** in drei Farben für verschiedene Altersstufen:
  Leicht (grün, ab ~5 J.), Mittel (orange, ab ~7 J.), Schwer (rot, ab ~9 J.).
- **Gelaufene Spur** ein-/ausblenden.
- **Ton & Vibration** an/aus – kurze Geräusche für Schritt, Drehung,
  Zusammenstoß und Sieg (per WebAudio erzeugt, keine Audiodateien nötig).
- **Tempo**: 🐢 langsam · 🐾 normal · 🐇 schnell.
- **Profi-Modus** mit Schleifen und Bedingungen.
- **📲 Als App installieren** (siehe unten).
- **Symbol-Legende**, die alle vorkommenden Symbole erklärt.

Alle Einstellungen werden im Browser gespeichert (localStorage).

## Als App installieren (PWA)

Code-Katze ist eine **Progressive Web App**: Über den Button
**„📲 Auf dem Gerät installieren"** in den Einstellungen (erscheint, sobald
der Browser die Installation anbietet) landet das Spiel als eigenes Icon
auf dem Home-Bildschirm und läuft dann **auch ohne Internet** (Service
Worker cached alle Dateien). Auf dem iPhone/iPad geht es über
Teilen → „Zum Home-Bildschirm"; die Einstellungen zeigen dort eine kurze
Anleitung.

Wird das Spiel **quer** gehalten (flaches Handy-Querformat), bittet ein
freundlicher Hinweis darum, das Gerät hochkant zu drehen – das Layout ist
bewusst fürs Hochformat gebaut.

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
index.html            – Struktur (Header, Spielfeld, Buttons, Queue, Overlays)
style.css             – Mobile-First Design (nur Emojis & CSS-Formen)
game.js               – Spiel-Logik (Vanilla JavaScript, ausführlich kommentiert)
manifest.webmanifest  – PWA-Manifest (Name, Farben, Icons)
sw.js                 – Service Worker (Offline-Cache; bei Änderungen die
                        CACHE_VERSION erhöhen!)
icon-192.png/-512.png – App-Icons
```

### Neue Level hinzufügen

Im Objekt `SCHWIERIGKEITEN` (oben in `game.js`) bei der passenden Stufe
(`leicht` / `mittel` / `schwer`) einfach einen neuen Eintrag an die
`levels`-Liste anhängen. Das Feld `min` (Länge der kürzesten Lösung) dient
nur der Info und der Sortierung – zur Laufzeit wird es frisch berechnet.
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

© JONFIE STUDIOS
