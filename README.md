# 🐱 Code-Katze

> **JONFIE STUDIOS präsentiert:** ein pädagogisches, Mobile-First Browserspiel,
> mit dem Kinder spielerisch **algorithmisches Denken** (Pre-Coding) üben.

## Idee

Die Code-Katze 🐱 soll zu ihrem Fisch 🐟 gesteuert werden. Aber Achtung: Das
Kind steuert die Katze **nicht direkt**. Stattdessen legt es zuerst eine Folge
von Befehlen in eine **Warteschlange** und lässt diese danach Schritt für
Schritt ausführen – genau wie ein kleines Computerprogramm.

Auf dem Weg lauern Hindernisse wie Wasserpfützen 💧, Hunde 🐶 und Zäune 🚧.
Läuft die Katze dagegen (oder gegen die Wand), schlägt der Versuch fehl. Das
ist nicht schlimm: **Die Warteschlange bleibt erhalten**, damit das Kind seinen
Code in Ruhe prüfen, den Fehler suchen („debuggen“) und verbessern kann. Es
gibt unendlich viele Versuche.

Das Ziel ist nicht immer ein Fisch – es gibt auch andere Dinge, die Katzen
mögen (🥛 Milch, 🐭 Maus, 🧶 Wollknäuel, 🐦 Vogel, 🦋 Schmetterling …).

## Steuerung

| Button | Bedeutung |
| ------ | --------- |
| ⬆️ Schritt | Einen Schritt in Blickrichtung vorwärts |
| ↺ Links drehen | Die Katze dreht sich **auf der Stelle** eine Vierteldrehung nach links (sie geht dabei nicht!) |
| ↻ Rechts drehen | Die Katze dreht sich auf der Stelle nach rechts |
| ▶︎ Start | Die Warteschlange ausführen |
| ⏹ Stopp | Während des Laufs wird der Start-Button zum Stopp-Button – das Programm hält sofort an. **Stoppen zählt nicht als Versuch.** |
| 🐾 1 Schritt | Einzelschritt-Modus: führt nur den **nächsten** Befehl aus und pausiert dann – ein kleiner „Debugger“ zum Nachvollziehen |
| 🧹 Löschen | Die gesamte Warteschlange leeren. Danach wird der Knopf zu **↩ Zurückholen** – ein versehentlicher Tipp kostet also kein Programm mehr. |

Die Dreh-Buttons zeigen bewusst **Rotations-Pfeile** (↺/↻) statt
Abbiege-Pfeilen, damit „drehen“ nicht mit „gehe nach links“ verwechselt wird –
beim Tippen drehen sich die Symbole kurz mit.

Am Desktop geht alles auch per **Tastatur**: Pfeiltasten = Befehle,
Enter = Start, **Leertaste = 1 Schritt**, Backspace = Block vor der
Einfügemarke (bzw. den letzten) löschen, Escape = Stopp/Fenster zu.
Im Profi-Modus zusätzlich: `2`/`3` = Schleifen, `z` = „bis Ziel“,
`f` = „solange frei“, `w` = „wenn frei“, `m` = „wenn Wand“,
`0` oder `)` = Klammer fertig.

## Profi-Modus (Schleifen & Logik)

Die Schleifen-Bausteine werden **im Spiel freigeschaltet**: Nach dem
10. leichten Level bietet ein Feier-Fenster („🔁 Neue Bausteine!“) an, sie
direkt auszuprobieren. Alternativ lässt sich der Profi-Modus jederzeit im
⚙️-Menü ein- und ausschalten.

| Baustein | Bedeutung |
| -------- | --------- |
| 🔁 2× ( … ) | Wiederholt den Inhalt **zweimal** |
| 🔁 3× ( … ) | Wiederholt den Inhalt **dreimal** |
| 🎯 bis Ziel ( … ) | Wiederholt den Inhalt, **bis das Ziel erreicht** ist |
| ➰ solange frei ( … ) | Wiederholt den Inhalt, **solange das Feld voraus frei** ist (While-Schleife) |
| ❓ wenn frei ( … ) | Führt den Inhalt nur aus, **wenn das Feld voraus frei** ist |
| 🧱 wenn Wand ( … ) | Führt den Inhalt nur aus, **wenn voraus eine Wand/ein Hindernis** ist |
| ) Ende | „Klammer fertig“ (siehe unten) |

**Klammern können nicht mehr falsch sein:** Jeder Schleifen-/Logik-Baustein
legt seine schließende `)` automatisch mit und setzt die Einfügemarke
**dazwischen** – die nächsten Befehle landen also in der Klammer. Der
`)`-Knopf bedeutet „Klammer fertig“ und springt hinter die Klammer (fehlt
tatsächlich mal eine `)`, fügt er sie ein). Wer einen Öffner löscht, löscht
automatisch auch die zugehörige `)` – der Inhalt bleibt erhalten. Blöcke
dürfen beliebig verschachtelt werden; leere Blöcke werden vor dem Start
freundlich gemeldet (und kosten keinen 💡-Versuch).

Dreht sich die Katze in einer Schleife **im Kreis** (gleicher Zustand wie
zuvor), bricht das Spiel sofort mit einer freundlichen Meldung ab – statt
das Kind eine Minute lang warten zu lassen.

## Level & Fortschritt

Es gibt **69 Level in drei Stufen** (Leicht 22 · Mittel 22 · Schwer 25), alle
per Breitensuche auf Lösbarkeit geprüft. Die Kern-Level jeder Stufe sind
**aufsteigend nach der Länge der kürzesten Lösung sortiert**; am Ende jeder
Stufe warten **Spezial-Level**:

- 🔁 **Budget-Level:** Das Programm darf nur eine begrenzte Zahl Bausteine
  haben („Schaffst du es mit höchstens 3?“) – hier führt kein Weg an
  Schleifen vorbei. Die Anzeige neben „Dein Programm:“ zählt mit, und die
  Profi-Leiste ist in diesen Leveln immer sichtbar.
- 🌫️ **Nebel-Level (Schwer):** Nur die Umgebung der Katze ist sichtbar;
  einmal aufgedeckte Felder bleiben offen. Hier lohnen sich „solange frei“
  & Co. wirklich – man sieht den Weg ja nicht komplett.
- 🧶 **Sammel-Level (Schwer):** Erst alle Wollknäuel einsammeln, dann zählt
  das Ziel.

Das allererste Level ist bewusst eine reine Geradeaus-Aufgabe (Katze schaut
aufs Ziel, zweimal ⬆️ genügt) – erst danach kommt das Drehen ins Spiel. Und
die Hindernisse liegen in den Kern-Leveln wirklich **im Weg** (per BFS
geprüft), nicht nur als Deko daneben.

Nach dem letzten Level einer Stufe geht es **automatisch eine Stufe höher**
(leicht → mittel → schwer); zurückgeschaltet wird nie automatisch. Der
**Fortschritt wird pro Stufe gespeichert** (localStorage). Ein Tipp auf die
**Level-Anzeige oben links** öffnet die **Level-Auswahl** mit Stufen-Tabs –
jeder Tab zeigt die **Sterne-Summe der Stufe** (z. B. „★ 34/66“), gelöste
Level ihre besten Sterne und 💡, ungelöste Spezial-Level ihr Symbol (🔁/🌫️/🧶).

Beim allerersten Start erklärt ein kurzes Hallo-Fenster das Spiel, danach
führt eine **interaktive Coach-Sprechblase** durch das erste Level – die
passenden Knöpfe pulsieren dabei.

## Bewertung (zwei Reihen)

Nach jedem gelösten Level gibt es zwei Bewertungen mit je **1–3 Symbolen**:

- **⭐ Sterne – cleverer Code:** Das Spiel kennt die theoretisch kürzeste
  Lösung (per Breitensuche, inklusive Sammelobjekte) und vergleicht sie mit
  der Anzahl deiner Bausteine. Die **Toleranz wächst mit der Levelgröße**:
  Bei Mini-Leveln zählt jeder Baustein, bei langen Wegen darf der Code etwas
  großzügiger sein. Wer mit einer **Schleife den Code wirklich verkürzt**
  (weniger Bausteine als ausgeführte Aktionen), bekommt einen
  **🔁 Schleifen-Bonus-Stern** – eine angehängte „Deko-Schleife“ ohne
  Wirkung bringt dagegen nichts.
- **💡 Glühbirnen – gleich richtig gedacht:** Beim **1. Versuch** gelöst gibt
  die volle Punktzahl; je mehr Versuche, desto weniger. Der Versuchszähler
  wird **pro Level gespeichert** – und **⏹ Stopp zählt nicht als Versuch**.

Ist noch Luft nach oben, erscheint ein **„Nochmal“**-Button: Das Level
startet dann **komplett frisch** (Programm weg, Versuchszähler auf 0).

## Sichtbares Feedback

Läuft etwas schief, zeigt das Spielbrett direkt **wo**: ein 💥 auf dem Feld,
gegen das die Katze gestoßen ist. Endet das Programm, ohne anzukommen,
erscheint ein ❓ bei der Katze, das **Zielfeld blinkt** kurz auf, und die
Meldung verrät, wie nah es schon war („Fast! Nur noch 3 Züge …“). Nach einem
Moment **schrumpft der Marker in die Ecke**, damit das Hindernis darunter
wieder sichtbar ist. Die gelaufene Spur mit Dreh-Symbolen (↺/↻) hilft beim
Nachvollziehen; beim Sieg gibt es erst eine kleine **Konfetti-Feier direkt am
Zielfeld**, bevor das Ergebnis-Fenster erscheint.

Das **×-Kreuz** an einem Befehlsblock **löscht** diesen. Ein Tipp auf den
**Block selbst** setzt eine **Einfügemarke**: Neue Befehle landen dann davor
(beim ersten Mal erklärt das eine kleine Hinweis-Blase). Die Warteschlange
bricht bei vielen Befehlen **mehrzeilig** um; sind Zeilen versteckt, zeigt
ein **Fade mit ⌄** am unteren Rand, dass man scrollen kann. Wächst die Queue
und das Brett schrumpft, ziehen Katze, Spur und Marker automatisch mit
(ResizeObserver).

## Einstellungen (⚙️ oben rechts)

- **Schwierigkeit** in drei Farben: Leicht (grün, ab ~5 J.), Mittel (orange,
  ab ~7 J.), Schwer (rot, ab ~9 J.). Jede Stufe merkt sich ihren Fortschritt.
- **Gelaufene Spur** ein-/ausblenden.
- **🔊 Ton** und **📳 Vibration** – getrennt schaltbar (WebAudio, keine
  Audiodateien nötig).
- **Tempo**: 🐢 langsam · 🐾 normal · 🐇 schnell.
- **Profi-Modus** mit Schleifen und Bedingungen. Das Programm bleibt beim
  Umschalten erhalten (nur beim Ausschalten mit enthaltenen Schleifen wird
  es geleert).
- **📲 Als App installieren** (siehe unten).
- **Symbol-Legende**, die alle vorkommenden Symbole erklärt.

Während die Katze läuft, sind Zahnrad und Level-Auswahl gesperrt – ein Tipp
darauf erklärt freundlich: „Erst ⏹ Stopp drücken!“

## Als App installieren (PWA)

Code-Katze ist eine **Progressive Web App**: Über den Button
**„📲 Auf dem Gerät installieren“** in den Einstellungen landet das Spiel als
eigenes Icon auf dem Home-Bildschirm und läuft dann **auch ohne Internet**.
Auf dem iPhone/iPad geht es über Teilen → „Zum Home-Bildschirm“.

Der Service Worker lädt HTML/CSS/JS **„network first“**: Updates kommen
sofort an, offline antwortet der Cache. (Die `CACHE_VERSION` in `sw.js` bei
Releases trotzdem erhöhen – sie räumt alte Caches weg.)

Wird das Spiel **quer** gehalten (flaches Handy-Querformat), bittet ein
freundlicher Hinweis darum, das Gerät hochkant zu drehen.

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
levels.js             – ALLE Level-Daten (69 Level in drei Stufen)
game.js               – Spiel-Logik (Vanilla JavaScript, ausführlich kommentiert)
manifest.webmanifest  – PWA-Manifest (Name, Farben, Icons)
sw.js                 – Service Worker (network-first für Code, Cache offline;
                        bei Releases die CACHE_VERSION erhöhen)
icon-192.png/-512.png – App-Icons
```

### Neue Level hinzufügen

Im Objekt `SCHWIERIGKEITEN` (in `levels.js`) bei der passenden Stufe
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
Z  = Zaun (Hindernis)
S  = Sammelobjekt (muss vor dem Ziel eingesammelt werden)
```

`blick` legt die Startblickrichtung fest: `0` = oben, `1` = rechts,
`2` = unten, `3` = links. Optionale Spezial-Felder pro Level:
`budget: 5` (maximale Baustein-Zahl), `nebel: true` (Nebel-Level),
`sammel: { i: '🧶', n: 'das Wollknäuel' }` (Emoji/Name der Sammelobjekte).

---

© JONFIE STUDIOS
